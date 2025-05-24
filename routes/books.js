const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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

// POST /books - Add a new book (Authenticated users only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, author, genre, description, published_year, isbn } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!title || !author) {
      return res.status(400).json({
        error: 'Title and author are required'
      });
    }

    if (title.length > 255 || author.length > 255) {
      return res.status(400).json({
        error: 'Title and author must be less than 255 characters'
      });
    }

    if (published_year && (published_year < 0 || published_year > new Date().getFullYear())) {
      return res.status(400).json({
        error: 'Please provide a valid publication year'
      });
    }

    // Check if book already exists (same title and author)
    const existingBook = await pool.query(
      'SELECT id FROM books WHERE LOWER(title) = LOWER($1) AND LOWER(author) = LOWER($2)',
      [title, author]
    );

    if (existingBook.rows.length > 0) {
      return res.status(409).json({
        error: 'A book with this title and author already exists'
      });
    }

    // Insert new book
    const result = await pool.query(`
      INSERT INTO books (title, author, genre, description, published_year, isbn, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `, [title, author, genre, description, published_year, isbn, userId]);

    const newBook = result.rows[0];

    res.status(201).json({
      message: 'Book added successfully',
      book: newBook
    });

  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({
      error: 'Internal server error while adding book'
    });
  }
});

// GET /books - Get all books with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page, limit, author, genre } = req.query;
    const { limit: limitNum, offset, page: pageNum } = getPagination(page, limit);

    // Build query with filters
    let query = `
      SELECT 
        b.*,
        u.username as created_by_username,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN reviews r ON b.id = r.book_id
    `;

    const queryParams = [];
    const conditions = [];

    // Add filters
    if (author) {
      conditions.push(`LOWER(b.author) LIKE LOWER($${queryParams.length + 1})`);
      queryParams.push(`%${author}%`);
    }

    if (genre) {
      conditions.push(`LOWER(b.genre) LIKE LOWER($${queryParams.length + 1})`);
      queryParams.push(`%${genre}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY b.id, u.username
      ORDER BY b.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limitNum, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM books b';
    const countParams = [];

    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      // Reuse the filter parameters for count query
      if (author) countParams.push(`%${author}%`);
      if (genre) countParams.push(`%${genre}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalBooks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBooks / limitNum);

    res.json({
      books: result.rows.map(book => ({
        ...book,
        average_rating: parseFloat(book.average_rating).toFixed(1),
        review_count: parseInt(book.review_count)
      })),
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_books: totalBooks,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching books'
    });
  }
});

// GET /books/:id - Get book details by ID
router.get('/:id', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { page, limit } = req.query;
    const { limit: limitNum, offset, page: pageNum } = getPagination(page, limit);

    if (isNaN(bookId)) {
      return res.status(400).json({
        error: 'Invalid book ID'
      });
    }

    // Get book details with average rating
    const bookResult = await pool.query(`
      SELECT 
        b.*,
        u.username as created_by_username,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.id = $1
      GROUP BY b.id, u.username
    `, [bookId]);

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    const book = bookResult.rows[0];

    // Get reviews with pagination
    const reviewsResult = await pool.query(`
      SELECT 
        r.*,
        u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [bookId, limitNum, offset]);

    // Get total reviews count
    const reviewCountResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE book_id = $1',
      [bookId]
    );

    const totalReviews = parseInt(reviewCountResult.rows[0].count);
    const totalPages = Math.ceil(totalReviews / limitNum);

    res.json({
      book: {
        ...book,
        average_rating: parseFloat(book.average_rating).toFixed(1),
        review_count: parseInt(book.review_count)
      },
      reviews: reviewsResult.rows,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_reviews: totalReviews,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get book details error:', error);
    res.status(500).json({
      error: 'Internal server error while fetching book details'
    });
  }
});

module.exports = router;