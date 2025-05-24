const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Helper function for pagination
const getPagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  return {
    limit: Math.min(limitNum, 50), // Max 50 items per page
    offset: Math.max(offset, 0),
    page: pageNum
  };
};

// GET /search - Search books by title or author (partial and case-insensitive)
router.get('/', async (req, res) => {
  try {
    const { q, page, limit } = req.query;
    const { limit: limitNum, offset, page: pageNum } = getPagination(page, limit);

    // Input validation
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query (q) is required'
      });
    }

    const searchTerm = q.trim();

    if (searchTerm.length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Search query using PostgreSQL full-text search and ILIKE for flexibility
    const searchQuery = `
      SELECT 
        b.*,
        u.username as created_by_username,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count,
        -- Ranking based on relevance
        CASE 
          WHEN LOWER(b.title) = LOWER($1) THEN 4
          WHEN LOWER(b.author) = LOWER($1) THEN 4
          WHEN LOWER(b.title) LIKE LOWER($2) THEN 3
          WHEN LOWER(b.author) LIKE LOWER($2) THEN 3
          ELSE 1
        END as relevance_score
      FROM books b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE 
        LOWER(b.title) LIKE LOWER($2) OR 
        LOWER(b.author) LIKE LOWER($2) OR
        to_tsvector('english', b.title || ' ' || b.author) @@ plainto_tsquery('english', $1)
      GROUP BY b.id, u.username
      ORDER BY relevance_score DESC, b.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const searchParams = [searchTerm, `%${searchTerm}%`, limitNum, offset];

    const result = await pool.query(searchQuery, searchParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) 
      FROM books b
      WHERE 
        LOWER(b.title) LIKE LOWER($2) OR 
        LOWER(b.author) LIKE LOWER($2) OR
        to_tsvector('english', b.title || ' ' || b.author) @@ plainto_tsquery('english', $1)
    `;

    const countResult = await pool.query(countQuery, [searchTerm, `%${searchTerm}%`]);
    const totalBooks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBooks / limitNum);

    // Format the results
    const books = result.rows.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      description: book.description,
      published_year: book.published_year,
      isbn: book.isbn,
      created_by_username: book.created_by_username,
      average_rating: parseFloat(book.average_rating).toFixed(1),
      review_count: parseInt(book.review_count),
      created_at: book.created_at,
      updated_at: book.updated_at
    }));

    res.json({
      query: searchTerm,
      books,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_books: totalBooks,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal server error while searching books'
    });
  }
});

module.exports = router;