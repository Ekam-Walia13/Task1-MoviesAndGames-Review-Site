


const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); // Ensure this is included if needed 
const session = require('express-session');

const app = express();

// Middleware

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));


app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

//Service-worker
app.use(express.static(path.join(__dirname, 'public')));

// Serve Service Worker file
app.get('/service-worker.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});

// Path to the SQLite database
const dbPath = path.join(__dirname, 'mydb', 'user_reviews.db');

// Initialize the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS user_reviews (
    username TEXT,
    reviewdate DATE,
    moviename TEXT,
    comments TEXT CHECK(length(comments) <= 500),                                                                                                                    
    rating INTEGER CHECK(rating >= 0 AND rating <= 5)
)`);

db.run(`CREATE TABLE IF NOT EXISTS game_reviews (
    username TEXT,
    reviewdate DATE,
    gamename TEXT,
    comments TEXT CHECK(length(comments) <= 500),                                                                                                                    
    rating INTEGER CHECK(rating >= 0 AND rating <= 5)
)`);


db.run(`CREATE TABLE IF NOT EXISTS movie_list (
    moviename TEXT PRIMARY KEY,
    releaseyear DATE,
    plot TEXT CHECK(length(plot) <= 700),
    imagepath TEXT,
    movielenght INTEGER
    
)`);

db.run(`CREATE TABLE IF NOT EXISTS games_list (
    gamename TEXT PRIMARY KEY,
    releaseyear DATE,
    storyline TEXT CHECK(length(storyline) <= 700),
    imagepath TEXT,
    agerating TEXT
    
)`);

db.run(`CREATE TABLE IF NOT EXISTS userstable (
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    dob TEXT,
    PRIMARY KEY (email, username)
)`, (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
    } else {
        console.log('Table created successfully.');
    }
});


// db.run(`CREATE TABLE IF NOT EXISTS userstable (
//     email TEXT NOT NULL,
//     username TEXT NOT NULL,
//     password TEXT,
//     dob TEXT,
//     PRIMARY KEY (email, username)
// )`);

// Route to handle form submission
app.post('/register', (req, res) => {
    const { username, email, password, dob } = req.body;
    const sql = `INSERT INTO userstable (username, email, password, dob) VALUES (?, ?, ?, ?)`;
    // Hash the password using SHA-256
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    db.run(sql, [username, email, hashedPassword, dob], (err) => {
        if (err) {
            return res.status(500).send('Error registering user');
        } else {
            res.redirect('/html/index.html');
        }
    });

    const sql1 = `SELECT * FROM userstable`;

    db.all(sql1, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving users');
        }
    });
});

// Route to handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT password FROM userstable WHERE username = ?`;
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Log to debug input data

    db.get(sql, [username], (err, row) => {
        if (err) {
            return res.status(500).send('Error logging in');
        }
        if (!row) {
            return res.status(400).send('User not found');
        }
        if (row.password === hashedPassword) {
            req.session.username =  username; // Set session variable
            // console.log('User parameter', req.session.username)
            const encodedUsername = encodeURIComponent(username); // Encode the username
            res.redirect(`/html/homepage.html`);
        } else {
            res.status(400).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Login Error</title>
                </head>
                <body>
                    <script>
                        alert('Incorrect username or password.    Try Again ');
                        window.location.href = '/html/index.html';
                    </script>
                </body>
                </html>
            `);
        }
    });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/html/index.html');
    });
});



// Route to serve homepage with username

function checkSession(req, res, next) {
    if (!req.session.username) {
        // console.log('function called')
        return res.redirect('/html/index.html');
    }
    next();
}

app.get('/html/homepage.html', checkSession, (req, res) => {
    // console.log('SESSION INFO', req.session.username);
    res.sendFile(path.join(__dirname, 'html', 'homepage.html'));
});
app.get('/html/homepage-movies.html', checkSession, (req, res) => {
    // console.log('SESSION INFO', req.session.username);
    res.sendFile(path.join(__dirname, 'html', 'homepage-movies.html'));
});





// Route to get username for display
app.get('/get-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).send('Not logged in');
    }
});




// Password reset route
app.post('/resetpassword', async (req, res) => {
    const { email, dob, password } = req.body;

    // Log to debug input data
    console.log('Email:', email);
    console.log('DOB:', dob);
    console.log('Password:', password);

    if (!email || !dob || !password) {
        return res.status(400).send('Missing required fields');
    }

    const sql = `SELECT dob FROM userstable WHERE email = ?`;
    console.log('SQL Update Statement:', sql); // Debugging log

    db.get(sql, [email], async (err, row) => {
        if (err) {
            return res.status(500).send('Error resetting password');
        }
        if (!row) {
            return res.status(400).send('Email not found');
        }
        if (row.dob === dob) {
            // Hash the new password before updating
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            const sql1 = `UPDATE userstable SET password = ? WHERE email = ?`;

            db.run(sql1, [hashedPassword, email], (err) => {
                if (err) {
                    return res.status(500).send('Error updating password');
                }
                res.redirect('/html/dashboard.html');
            });
        } else {
            res.status(400).send('Email or Date of Birth not correct');
        }
    });
});


// Route to fetch movie names
app.get('/get-movies', (req, res) => {
    const sql = `SELECT * FROM movie_list`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // console.log({movies: rows});
        res.json({ movies: rows });
    });
});

// Route to serve homepage-movies.html
app.get('/html/homepage-movies.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'homepage-movies.html'));
});

//Route Moviewreviews
app.get('/moviereview', (req, res) => {
    const moviename = req.query.moviename;
    const sql = `SELECT * FROM movie_list WHERE moviename = ?`;
    db.get(sql, [moviename], (err, row) => {
        if (err) {
            return res.status(500).send('Error retrieving movie review');
        }
        if (!row) {
            return res.status(404).send('Movie not found');
        }
        res.json(row); // Send the movie details as JSON
    });
});


//Route Existing Gamereviews
app.get('/gamereview', (req, res) => {
    const gamename = req.query.gamename;
    const sql = `SELECT * FROM games_list WHERE gamename = ?`;
    db.get(sql, [gamename], (err, row) => {
        if (err) {
            return res.status(500).send('Error retrieving movie review');
        }
        if (!row) {
            return res.status(404).send('Movie not found');
        }
        res.json(row); // Send the movie details as JSON
    });
});


// Route to fetch gamesnames
app.get('/get-games', (req, res) => {
    const sql = `SELECT * FROM games_list`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ games: rows });
    });
});

// Route to serve homepage-movies.html
app.get('/html/homepage-movies.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'homepage-movies.html'));
});





//New User Movie Reviews
app.post('/user_review', (req, res) => {
    const { username, moviename, date, userreview, rating } = req.body;
    const sql = `INSERT INTO user_reviews (username, moviename, reviewdate, comments, rating) VALUES (?, ?, ?, ?, ?)`;
    // Here you would typically save the review to a database
    // For demonstration, we'll just log it and send a success response
    console.log('Received review:', {
        username,
        moviename,
        date,
        userreview,
        rating
    });
    db.run(sql, [username, moviename, date, userreview, rating], (err) => {
        if (err) {
            return res.status(500).send('Error Submitting Review');
        } else {
            console.log('Successful Sumission')
            res.json({ message: 'WOW Review submitted successfully!' });
            // res.redirect('/html/homepage-movies.html');
        }
    });


});

//New Games Reviews
app.post('/games-review', (req, res) => {
    console.log("games review called")
    const { username, gamename, userreview, date, rating } = req.body;
    const sql = `INSERT INTO game_reviews (username, gamename, reviewdate, comments, rating) VALUES (?, ?, ?, ?, ?)`;
    // Here you would typically save the review to a database
    // For demonstration, we'll just log it and send a success response
    console.log('Received review:', {
        username,
        gamename,
        date,
        userreview,
        rating
    });
    db.run(sql, [username, gamename, date, userreview, rating], (err) => {
        if (err) {
            return res.status(500).send('Error Submitting Review');
        } else {
            console.log('Successful Sumission')
            res.json({ message: 'WOW Review submitted successfully!' });
            // res.redirect('/html/homepage-movies.html');
        }
    });


});



// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/index.html');
    });
});



// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Route to get past reviews
app.get('/past-reviews', checkSession, (req, res) => {
    const username = req.session.username;

    const userReviewsQuery = `
        SELECT moviename, reviewdate, comments, rating 
        FROM user_reviews 
        WHERE username = ?
    `;
    const gameReviewsQuery = `
        SELECT gamename, reviewdate, comments, rating 
        FROM game_reviews 
        WHERE username = ?
    `;

    db.serialize(() => {
        db.all(userReviewsQuery, [username], (err, userReviews) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching movie reviews' });
            }

            db.all(gameReviewsQuery, [username], (err, gameReviews) => {
                if (err) {
                    return res.status(500).json({ error: 'Error fetching game reviews' });
                }

                // Attach the username explicitly to each row
                const userReviewsWithUsername = userReviews.map(review => ({
                    ...review,
                    username: username
                }));

                const gameReviewsWithUsername = gameReviews.map(review => ({
                    ...review,
                    username: username
                }));

                res.json({ userReviews: userReviewsWithUsername, gameReviews: gameReviewsWithUsername });
            });
        });
    });
});




app.get('/get-top-ratings', checkSession, (req, res) => {
    const username = req.session.username;

    const topMoviesQuery = `
        SELECT moviename, rating
        FROM user_reviews
        WHERE username = ?
        ORDER BY rating DESC
        LIMIT 5
    `;

    const topGamesQuery = `
        SELECT gamename, rating
        FROM game_reviews
        WHERE username = ?
        ORDER BY rating DESC
        LIMIT 5
    `;

    db.serialize(() => {
        db.all(topMoviesQuery, [username], (err, topMovies) => {
            if (err) {
                return res.status(500).json({ error: "Error fetching top movies" });
            }
            db.all(topGamesQuery, [username], (err, topGames) => {
                if (err) {
                    return res.status(500).json({ error: "Error fetching top games" });
                }
                res.json({ topMovies, topGames });
            });
        });
    });
});




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
