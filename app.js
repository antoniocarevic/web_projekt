const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = 3000;
const SECRET_KEY = 'yxdlt24';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'project_web',
    password: 'password',
    port: 5432,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); 

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); 
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username",
            [username, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Korisnik s tim imenom ili emailom već postoji.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Korisnik nije pronađen.' });
    }
    const user = result.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
        return res.status(400).json({ error: 'Neispravna lozinka.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/api/user/books', authenticateToken, async (req, res) => {
    try {
        const userBooks = await pool.query(
            `SELECT b.id, b.title, b.author, b.cover_url, ub.status, ub.rating, ub.review
             FROM user_books ub
             JOIN books b ON ub.book_id = b.id
             WHERE ub.user_id = $1`,
            [req.user.id]
        );
        res.json(userBooks.rows);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju knjiga.' });
    }
});

app.post('/api/user/books', authenticateToken, async (req, res) => {
    const { bookId, title, author, cover_url } = req.body;
    const userId = req.user.id;
    try {
        await pool.query(
            `INSERT INTO books (id, title, author, cover_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [bookId, title, author, cover_url]
        );
        
        const newUserBook = await pool.query(
            `INSERT INTO user_books (user_id, book_id, status)
             VALUES ($1, $2, 'want_to_read')
             RETURNING *`,
            [userId, bookId]
        );
        res.status(201).json(newUserBook.rows[0]);
    } catch (err) {
        res.status(400).json({ error: 'Knjiga je već na vašoj listi.' });
    }
});

app.put('/api/user/books/:bookId', authenticateToken, async (req, res) => {
    const { bookId } = req.params;
    const { status, rating, review } = req.body;
    const userId = req.user.id;
    try {
        const updatedBook = await pool.query(
            `UPDATE user_books SET status = $1, rating = $2, review = $3
             WHERE user_id = $4 AND book_id = $5 RETURNING *`,
            [status, rating, review, userId, bookId]
        );
        if (updatedBook.rows.length === 0) return res.sendStatus(404);
        res.json(updatedBook.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri ažuriranju.' });
    }
});

app.listen(port, () => {
    console.log(`Server sluša na http://localhost:${port}`);
});

app.get('/api/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju knjiga.' });
    }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Korisnik nije pronađen.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju korisnika.' });
    }
});

app.get('/api/books/popular', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.title, b.author, b.cover_url, COUNT(ub.user_id) AS user_count
            FROM books b
            JOIN user_books ub ON b.id = ub.book_id
            GROUP BY b.id
            ORDER BY user_count DESC
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju najpopularnijih knjiga.' });
    }
});

app.get('/api/books/recommended', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT title, author, cover_url
            FROM books
            ORDER BY RANDOM()
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju preporučenih knjiga.' });
    }
});

app.get('/api/books/newest-published', async (req, res) => {
    try {
        const url = 'https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=10';
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data.items || []);
    } catch (err) {
        console.error('Greška pri dohvaćanju najnovijih objavljenih knjiga:', err);
        res.status(500).json({ error: 'Greška pri dohvaćanju najnovijih objavljenih knjiga.' });
    }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
        return res.json([]);
    }
    
    try {
        const result = await pool.query(`
            SELECT id, username 
            FROM users 
            WHERE username ILIKE $1 
            LIMIT 10
        `, [`%${q.trim()}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri pretraživanju korisnika.' });
    }
});

app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    
    try {
        const userResult = await pool.query(
            'SELECT id, username FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Korisnik nije pronađen.' });
        }
        
        // Dohvati sve knjige (ne samo read i reading)
        const booksResult = await pool.query(`
            SELECT b.id, b.title, b.author, b.cover_url, ub.status, ub.rating, ub.review
            FROM user_books ub
            JOIN books b ON ub.book_id = b.id
            WHERE ub.user_id = $1
            ORDER BY 
                CASE ub.status 
                    WHEN 'reading' THEN 1 
                    WHEN 'want_to_read' THEN 2
                    WHEN 'read' THEN 3 
                    WHEN 'dropped' THEN 4
                END,
                ub.rating DESC NULLS LAST
        `, [userId]);
        
        const stats = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM user_books 
            WHERE user_id = $1 
            GROUP BY status
        `, [userId]);
        
        res.json({
            user: userResult.rows[0],
            books: booksResult.rows,
            stats: stats.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dohvaćanju profila.' });
    }
});
