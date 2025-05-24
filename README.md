# 📚 Book Review API

A RESTful API built with Node.js and Express for managing book reviews with JWT authentication. Users can add books, write reviews, and search through the collection.

## 🛠️ Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt, helmet, cors, rate limiting
- **Environment**: dotenv for configuration

## 🚀 Features

- **User Authentication**: Secure signup/login with JWT
- **Book Management**: Add and browse books with detailed information
- **Review System**: One review per user per book with ratings (1-5 stars)
- **Advanced Search**: Full-text search by title and author
- **Pagination**: All list endpoints support pagination
- **Filtering**: Filter books by author and genre
- **Data Validation**: Comprehensive input validation
- **Security**: Rate limiting, CORS, and security headers

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone <https://github.com/VaibhavMishra173/book-review-api.git>
cd book-review-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=book_review_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Set up PostgreSQL database

Create a PostgreSQL database:
```sql
CREATE DATABASE book_review_db;
CREATE USER your_db_user WITH PASSWORD 'your_db_password';
GRANT ALL PRIVILEGES ON DATABASE book_review_db TO your_db_user;
```

### 5. Initialize database tables
```bash
npm run setup-db
```

### 6. Start the server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## 📊 Database Schema

### Users Table
```sql
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Books Table
```sql
books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  description TEXT,
  published_year INTEGER,
  isbn VARCHAR(20),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Reviews Table
```sql
reviews (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, user_id)
)
```

## 🔌 API Endpoints

### Authentication

#### Register User
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Books

#### Add New Book (Authentication Required)
```bash
POST /api/books
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "genre": "Classic Literature",
  "description": "A classic American novel about the Jazz Age",
  "published_year": 1925,
  "isbn": "9780743273565"
}
```

#### Get All Books
```bash
GET /api/books?page=1&limit=10&author=fitzgerald&genre=classic

# Query Parameters:
# - page: Page number (default: 1)
# - limit: Items per page (default: 10, max: 50)
# - author: Filter by author (partial match)
# - genre: Filter by genre (partial match)
```

#### Get Book Details
```bash
GET /api/books/1?page=1&limit=5

# Includes book details, average rating, and paginated reviews
```

### Reviews

#### Submit Review (Authentication Required)
```bash
POST /api/books/1/reviews
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "rating": 5,
  "review_text": "An amazing book that captures the essence of the American Dream!"
}
```

#### Update Your Review (Authentication Required)
```bash
PUT /api/reviews/1
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "rating": 4,
  "review_text": "Updated review text"
}
```

#### Delete Your Review (Authentication Required)
```bash
DELETE /api/reviews/1
Authorization: Bearer <your_jwt_token>
```

### Search

#### Search Books
```bash
GET /api/search?q=gatsby&page=1&limit=10

# Query Parameters:
# - q: Search query (required, min 2 characters)
# - page: Page number (default: 1)
# - limit: Items per page (default: 10, max: 50)
```

## 🧪 Example API Usage

### Complete workflow example:

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bookworm",
    "email": "bookworm@example.com",
    "password": "reading123"
  }'

# 2. Login (save the token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bookworm@example.com",
    "password": "reading123"
  }'

# 3. Add a book (use token from login)
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Dune",
    "author": "Frank Herbert",
    "genre": "Science Fiction",
    "description": "A science fiction masterpiece",
    "published_year": 1965
  }'

# 4. Get all books
curl http://localhost:3000/api/books

# 5. Search books
curl "http://localhost:3000/api/search?q=dune"

# 6. Add a review
curl -X POST http://localhost:3000/api/books/6/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "rating": 5,
    "review_text": "One of the best sci-fi novels ever written!"
  }'
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive validation for all inputs
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: helmet.js for various security headers

## 🎯 Design Decisions & Assumptions

1. **One Review Per User Per Book**: Prevents spam and maintains review integrity
2. **PostgreSQL Choice**: Better for relational data and complex queries
3. **JWT Expiration**: 7-day default expiration for good security/UX balance
4. **Pagination**: Default limit of 10, maximum of 50 to prevent performance issues
5. **Soft Search**: Case-insensitive partial matching for better user experience
6. **Review Ownership**: Users can only modify their own reviews
7. **Book Creation**: Any authenticated user can add books (could be restricted in production)

## 🐛 Error Handling

The API provides comprehensive error responses:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE" // In some cases
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use environment variables for all configuration
3. Set up proper CORS origins
4. Configure database connection pooling
5. Set up logging (consider Winston or similar)
6. Use PM2 or similar for process management
7. Set up SSL/TLS certificates
8. Configure reverse proxy (nginx)

---