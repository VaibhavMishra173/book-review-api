const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkReviewOwnership } = require('../middleware/auth');

const router = express.Router();

// POST /books/:id/reviews - Submit a review (Authenticated users only)
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const userId = req.user.id;
    const { rating, review_text } = req.body;

    // Input validation
    if (isNaN(bookId)) {
      return res.status(400).json({
        error: 'Invalid book ID'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    if (review_text && review_text.length > 2000) {
      return res.status(400).json({
        error: 'Review text must be less than 2000 characters'
      });
    }

    // Check if book exists
    const bookExists = await pool.query(
      'SELECT id FROM books WHERE id = $1',
      [bookId]
    );

    if (bookExists.rows.length === 0) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    // Check if user has already reviewed this book
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: 'You have already reviewed this book. Use PUT to update your review.'
      });
    }

    // Insert new review
    const result = await pool.query(`
      INSERT INTO reviews (book_id, user_id, rating, review_text) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [bookId, userId, rating, review_text]);

    const newReview = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      review: {
        ...newReview,
        username: userResult.rows[0].username
      }
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      error: 'Internal server error while submitting review'
    });
  }
});

// PUT /reviews/:id - Update your own review
router.put('/:id', authenticateToken, checkReviewOwnership, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { rating, review_text } = req.body;

    // Input validation
    if (isNaN(reviewId)) {
      return res.status(400).json({
        error: 'Invalid review ID'
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    if (review_text && review_text.length > 2000) {
      return res.status(400).json({
        error: 'Review text must be less than 2000 characters'
      });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    if (rating !== undefined) {
      updateFields.push(`rating = $${paramCounter}`);
      updateValues.push(rating);
      paramCounter++;
    }

    if (review_text !== undefined) {
      updateFields.push(`review_text = $${paramCounter}`);
      updateValues.push(review_text);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'At least one field (rating or review_text) must be provided'
      });
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(reviewId);

    const updateQuery = `
      UPDATE reviews 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    // Get user info for response
    const userResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      message: 'Review updated successfully',
      review: {
        ...result.rows[0],
        username: userResult.rows[0].username
      }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      error: 'Internal server error while updating review'
    });
  }
});

// DELETE /reviews/:id - Delete your own review
router.delete('/:id', authenticateToken, checkReviewOwnership, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);

    if (isNaN(reviewId)) {
      return res.status(400).json({
        error: 'Invalid review ID'
      });
    }

    // Delete the review
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING *',
      [reviewId]
    );

    res.json({
      message: 'Review deleted successfully',
      deleted_review: result.rows[0]
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      error: 'Internal server error while deleting review'
    });
  }
});

module.exports = router;