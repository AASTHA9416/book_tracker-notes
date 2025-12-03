import "dotenv/config"; // Load environment variables from .env
import express from "express";
import pg from "pg";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

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

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // cursor-ai make this change: enable JSON body parsing for fetch requests
app.use(express.static("public"));

// Passport configuration for Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists in database
        const result = await db.query(
          "SELECT * FROM users WHERE google_id = $1",
          [profile.id]
        );

        if (result.rows.length > 0) {
          // User exists, return user
          return done(null, result.rows[0]);
        } else {
          // Create new user
          const newUser = await db.query(
            "INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *",
            [profile.displayName, profile.emails[0].value, profile.id]
          );
          return done(null, newUser.rows[0]);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Expose the currently active user to all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

async function allBooks() {
  // Get all books with user information
  const books = await db.query(
    `SELECT b.*, u.name as owner_name, u.id as owner_id 
     FROM books_studied b 
     JOIN users u ON b.user_id = u.id 
     ORDER BY b.curr_date DESC`
  );
  return books.rows;
}

// Authentication routes
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Set the active user_id to the logged-in user
    user_id = req.user.id;
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/login");
  });
});

app.get("/", isAuthenticated, async (req, res) => {
  try {
    const allBooksData = await allBooks();

    // Render the home page with all books
    res.render("index.ejs", {
      books: allBooksData,
      currentUserId: req.user.id,
    });
  } catch (err) {
    console.error("Error loading home page:", err);
    res.status(500).send("Failed to load content. Check database connection and server logs.");
  }
});

// Users are created automatically via OAuth - no manual add user route needed

// Users can't switch accounts - removed changeUser route

app.get("/addBook", isAuthenticated, async (req, res) => {
  try {
    res.render("addNewBooks.ejs");
  } catch (err) {
    console.log(err);
  }
});

app.post("/newBook", isAuthenticated, async (req, res) => {
  try {
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
        [title, author, key, value, curr_date, ratings, about, req.user.id, url]
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

app.post("/notes", isAuthenticated, async (req, res) => {
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

app.post("/edit", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.body.book_id, 10);
    
    const bookResult = await db.query("SELECT * FROM books_studied WHERE id = $1", [id]);
    const notesResult = await db.query("SELECT notes FROM notes WHERE book_id = $1", [id]);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found.");
    }
    
    const bookData = bookResult.rows[0];
    
    // Check if the book belongs to the current user
    if (bookData.user_id !== req.user.id) {
      return res.status(403).send("You can only edit your own books.");
    }
    
    bookData.notes = notesResult.rows[0]?.notes || ""; 

    res.render("addNewBooks.ejs", {
      edit: bookData 
    });
  } catch (err) {
    console.error("Error fetching book for edit:", err);
    res.status(500).send("An error occurred while preparing to edit the book.");
  }
});

app.post("/updateBook", isAuthenticated, async (req, res) => {
  try {
    const { title, author, about, notes, ratings, key, value, bookId } = req.body;
    
    // Check ownership before updating
    const ownerCheck = await db.query("SELECT user_id FROM books_studied WHERE id = $1", [bookId]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).send("You can only update your own books.");
    }
    
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

app.post("/delete", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.body.book_id, 10);
    
    // Check ownership before deleting
    const ownerCheck = await db.query("SELECT user_id FROM books_studied WHERE id = $1", [id]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).send("You can only delete your own books.");
    }
    
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
