Book Tracker & Notes App

This is a full-stack web application that allows multiple users to track the books they have read, assign ratings, and write personal notes for each book. It uses the OpenLibrary API to fetch book cover images automatically.

The application allows for switching between different user accounts, and each user has their own private list of books.

💻 Tech Stack

Backend: Node.js, Express.js

Database: PostgreSQL (using the pg package)

Frontend: EJS (Embedded JavaScript templates)

API: OpenLibrary Covers API

✨ Features

Multi-User Accounts: Add new users and switch between them to see personal book lists.

Book CRUD:

Create: Add new books with title, author, rating, and a summary.

Read: View all books for the currently active user.

Update: Edit all details of an existing book.

Delete: Remove a book from the list.

Personal Notes: Add, view, and update detailed notes for each book.

Dynamic Book Covers: Automatically fetches and displays book covers from the OpenLibrary API based on the book's title and author.

Star Ratings: Assign a 1-5 star rating to each book.

🚀 How to Run This Project

1. Database Setup (Crucial Step)

This project requires a running PostgreSQL server.

Create a Database:
Open psql or your preferred database GUI (like pgAdmin) and create a new database.

CREATE DATABASE books;


Connect to your new database (\c books) and create the required tables. Note: The notes table uses ON DELETE CASCADE so that when a book is deleted, its notes are automatically deleted too.

-- Create the users table first
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Create the main books table, which references the users table
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

-- Create the notes table, which references the books_studied table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    notes TEXT,
    book_id INTEGER REFERENCES books_studied(id) ON DELETE CASCADE
);


2. Project Setup

Clone the Repository:

git clone [https://github.com/AASTHA9416/book_tracker-notes.git](https://github.com/AASTHA9416/book_tracker-notes.git)
cd book_tracker-notes


Install Dependencies:

npm install express body-parser pg ejs


Update Database Credentials:
Open index.js and update the db.Client object with your own PostgreSQL user, host, database name, and password.

const db = new pg.Client({
  user: "your_postgres_user",
  host: "localhost",
  database: "books", // The database you created
  password: "your_password",
  port: 5432,
});


Run the Server:

node index.js


Open the App:
Your server is now running. Open your browser and go to:
http://localhost:3000

there is also files for docker 
to build image : docker compose build
to build and run container: docker compose up
to delete and stop container: docker compose down