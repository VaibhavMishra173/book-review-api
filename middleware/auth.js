const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists in database
    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token - user not found' 
      });
    }

    // Add user info to request object
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error' 
    });
  }
};

// Middleware to check if user owns the resource (for reviews)
const checkReviewOwnership = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;

    const reviewResult = await pool.query(
      'SELECT user_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Review not found' 
      });
    }

    if (reviewResult.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        error: 'You can only modify your own reviews' 
      });
    }

    next();
  } catch (error) {
    console.error('Review ownership check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error' 
    });
  }
};

module.exports = {
  authenticateToken,
  checkReviewOwnership
};