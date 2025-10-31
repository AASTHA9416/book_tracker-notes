import "dotenv/config"; // Load environment variables from .env
import express from "express";
import pg from "pg";

let user_id = parseInt(process.env.ACTIVE_USER_ID || "1", 10);

const db = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "books",
        password: process.env.DB_PASSWORD || "",
        port: parseInt(process.env.DB_PORT || "5432", 10),
      }
);
try {
  await db.connect();
  console.log("successfully connected");
} catch (error) {
  console.log(error.message);
}

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

// Configure EJS view engine for server-side template rendering
app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // cursor-ai make this change: enable JSON body parsing for fetch requests
app.use(express.static("public"));

// Expose the currently active user id to all templates as `activeUserId`
app.use((req, res, next) => {
  res.locals.activeUserId = user_id;
  next();
});

async function allUsers() {
  const users = await db.query("select * from users");
  return users.rows;
}

async function userBooks() {
  const books = await db.query("select * from books_studied where user_id=$1", [
    user_id,
  ]);
  return books.rows;
}

app.get("/", async (req, res) => {
  try {
    const users = await allUsers();
    const currentUserBooks = await userBooks();
    // console.log(users);

    // Render the home page with all users, current user's books, and active user id
    res.render("index.ejs", {
      user: users,
      book: currentUserBooks,
      activeUserId: user_id,
    });
  } catch (err) {
    console.error("Error loading home page:", err);
    res.status(500).send("Failed to load content. Check database connection and server logs.");
  }
});

app.post("/add", async (req, res) => {
  try {
    const newUserName = req.body.newUser;
    console.log(`new user name is ${newUserName} `);
    try {
      const result = await db.query(
        "insert into users (name) values($1) returning id",
        [newUserName]
      );
      user_id = result.rows[0].id;
      res.render("addNewBooks.ejs");
    } catch (err) {
      console.log(err);
      console.log("enter a unique name");
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/changeUser", async (req, res) => {
  try {
    // cursor-ai make this change: read userId from JSON body and update active user
    const newUserId = parseInt(req.body.userId, 10);
    if (!Number.isFinite(newUserId)) {
      return res.status(400).send("Invalid user id");
    }
    user_id = newUserId;
    console.log("Active user switched to:", user_id);
    // Respond without redirect; client will reload the page
    res.sendStatus(204); // cursor-ai make this change
  } catch (err) {
    console.error("Error changing user:", err);
  }
});

app.post("/addBook", async (req, res) => {
  try {
    res.render("addNewBooks.ejs");
  } catch (err) {
    console.log(err.body);
  }
});

app.post("/newBook", async (req, res) => {
  try {
    const curruser = user_id;
    const title = req.body.title;
    const author = req.body.author;
    const about = req.body.about;
    const notes = req.body.notes;
    const ratings = req.body.ratings;
    const key = req.body.key;
    const value = req.body.value;
    const curr_date = new Date();
    // Use Medium cover image (M) for better clarity; size is constrained via CSS
    const url = `https://covers.openlibrary.org/b/${key}/${value}-M.jpg`;
    try {
      const result = await db.query(
        "INSERT INTO books_studied (title,author,key,value,curr_date,ratings,about,user_id,url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
        [title, author, key, value, curr_date, ratings, about, user_id, url]
      );
      const bookId = result.rows[0].id;
      await db.query("INSERT INTO notes (notes, book_id) VALUES ($1, $2)", [notes, bookId]);
      res.redirect("/");
    } catch (err) {
      res.status(500).send("An error occurred while adding the book.");
    }
  } catch (err) {
    console.log(err.body);
  }
});

app.post("/notes", async (req, res) => {
  const id = req.body.book_id;
  
  const result = await db.query("select notes from notes where book_id=$1", [id]);
  
  if (result.rows.length > 0) {
      res.render("notes.ejs", {
          notes: result.rows[0].notes
      });
  } else {
      res.render("notes.ejs", {
          notes: "No notes found for this book."
      });
  }
});

app.post("/edit", async (req, res) => {
  try {
    const id = parseInt(req.body.book_id, 10);
    
    const bookResult = await db.query("SELECT * FROM books_studied WHERE id = $1", [id]);
    const notesResult = await db.query("SELECT notes FROM notes WHERE book_id = $1", [id]);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found.");
    }
    
    const bookData = bookResult.rows[0];
    bookData.notes = notesResult.rows[0]?.notes || ""; 

    res.render("addNewBooks.ejs", {
      edit: bookData 
    });
  } catch (err) {
    console.error("Error fetching book for edit:", err);
    res.status(500).send("An error occurred while preparing to edit the book.");
  }
});

app.post("/updateBook", async (req, res) => {
  try {
    const { title, author, about, notes, ratings, key, value, bookId } = req.body;
    // Use Medium cover image (M) for updates as well; UI scales it down
    const url = `https://covers.openlibrary.org/b/${key}/${value}-M.jpg`;
    const curr_date = new Date();
    
    await db.query(
      `UPDATE books_studied
       SET title = $1, author = $2, about = $3, ratings = $4, key = $5, value = $6, url = $7, curr_date = $8
       WHERE id = $9`,
      [title, author, about, ratings, key, value, url, curr_date, bookId]
    );

    await db.query(
      `UPDATE notes
       SET notes = $1
       WHERE book_id = $2`,
      [notes, bookId]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).send("An error occurred while updating the book.");
  }
});

app.post("/delete", async (req, res) => {
  try {
    const id = parseInt(req.body.book_id, 10);
    
    await db.query("DELETE FROM notes WHERE book_id=$1", [id]);
    
    await db.query("DELETE FROM books_studied WHERE id=$1", [id]);
    
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).send("An error occurred while deleting the book.");
  }
});

app.listen(port, () => {
  console.log(`Server is running at port : ${port}`);
});
