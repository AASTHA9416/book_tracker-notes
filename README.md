# 📚 Family Book Tracker & Notes

A modern web app to track your reading journey with Google OAuth authentication and a beautiful dark theme.

## ✨ Features

- 🔐 **Google OAuth** - Secure sign-in with Google
- 📖 **Book Library** - Add, edit, and track books
- 👨‍👩‍👧‍👦 **Family Sharing** - View all books but edit only your own
- 🌙 **Dark Theme** - Modern glassmorphism UI
- 📝 **Personal Notes** - Write detailed notes for each book
- ⭐ **Star Ratings** - Rate books 1-5 stars
- 📚 **Auto Covers** - Fetches book covers from OpenLibrary API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))

### 1. Clone & Install
```bash
git clone https://github.com/AASTHA9416/book_tracker-notes.git
cd book_tracker-notes
npm install
```

### 2. Database Setup
```sql
-- Create database
CREATE DATABASE books;

-- Connect to database (\c books) and run:
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE
);

CREATE TABLE books_studied (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    key VARCHAR(255),
    value VARCHAR(255),
    curr_date DATE,
    ratings INTEGER CHECK (ratings >= 1 AND ratings <= 5),
    about TEXT,
    url TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    notes TEXT,
    book_id INTEGER REFERENCES books_studied(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Google+ API → Create OAuth 2.0 credentials
3. Set redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Client Secret

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=books

# Google OAuth (from step 3)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session Secret (random string)
SESSION_SECRET=your-very-random-secret-string-here

# Server
PORT=3000
NODE_ENV=development
```

### 5. Run the App
```bash
npm start
```

Visit **http://localhost:3000** and sign in with Google! 🎉

## 🐳 Docker (Alternative)

```bash
# Build and run
docker compose up

# Stop
docker compose down
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Passport.js
- **Database**: PostgreSQL
- **Frontend**: EJS, Custom CSS (Dark Theme)
- **Auth**: Google OAuth 2.0
- **API**: OpenLibrary Covers API

## 🐛 Troubleshooting

**"redirect_uri_mismatch"**
- Check Google Console redirect URI matches exactly

**"Missing GOOGLE_CLIENT_ID"**
- Ensure `.env` file exists and is configured
- Restart server after editing

**Database Connection Failed**
- Verify PostgreSQL is running
- Check credentials in `.env`

**Can't Access Pages**
- Sign in via `/login` first (authentication required)

## 👤 Author

**Aastha Bansal**
- 📧 [aasthabansal741@gmail.com](mailto:aasthabansal741@gmail.com)
- 💻 [@AASTHA9416](https://github.com/AASTHA9416)

---

**Built with 💜 by Aastha Bansal**