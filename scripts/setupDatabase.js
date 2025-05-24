const pool = require('../config/database');

const createTables = async () => {
  try {
    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(100),
        description TEXT,
        published_year INTEGER,
        isbn VARCHAR(20),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(book_id, user_id)
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_books_title ON books USING gin(to_tsvector('english', title))
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_books_author ON books USING gin(to_tsvector('english', author))
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)
    `);

    console.log('Database tables created successfully!');
    
    // Insert sample data
    await insertSampleData();
    
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
};

const insertSampleData = async () => {
  try {
    // Check if sample data already exists
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('Sample data already exists. Skipping insertion.');
      return;
    }

    // Insert sample books (without user reference for now)
    await pool.query(`
      INSERT INTO books (title, author, genre, description, published_year, isbn) VALUES
      ('The Great Gatsby', 'F. Scott Fitzgerald', 'Classic Literature', 'A classic American novel about the Jazz Age', 1925, '9780743273565'),
      ('To Kill a Mockingbird', 'Harper Lee', 'Classic Literature', 'A story of racial injustice and childhood innocence', 1960, '9780446310789'),
      ('1984', 'George Orwell', 'Dystopian Fiction', 'A dystopian novel about totalitarian control', 1949, '9780451524935'),
      ('Pride and Prejudice', 'Jane Austen', 'Romance', 'A romantic novel about manners and marriage', 1813, '9780141439518'),
      ('The Catcher in the Rye', 'J.D. Salinger', 'Coming-of-age', 'A controversial novel about teenage rebellion', 1951, '9780316769174')
    `);

    console.log('Sample books inserted successfully!');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

// Run the setup
createTables();