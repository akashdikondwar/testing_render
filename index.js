// --- 1. Dependencies ---
const express = require('express');
// Use the 'mysql2/promise' module for cleaner async/await syntax
const mysql = require('mysql2/promise');
// NOTE: For real-world use, you would install and use 'dotenv' here:
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads (for POST requests)
app.use(express.json());

// --- 2. Database Configuration (!!! REPLACE PLACEHOLDERS !!!) ---
// In a production environment, these values would be loaded from environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    // <-- CRITICAL: Replace with your actual password
    password: process.env.DB_PASSWORD || 'pass@123', 
    // <-- CRITICAL: Replace with your actual database name (e.g., 'taskmanager')
    database: process.env.DB_DATABASE || 'medlink', 
    port : process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Max number of simultaneous connections
    queueLimit: 0
};

let pool; // Connection pool instance

// --- 3. Database Connection & Setup Function ---
async function initializeDatabase() {
    try {
        // Create a connection pool using mysql2/promise
        pool = mysql.createPool(dbConfig);
        console.log('Successfully connected to MySQL pool.');

        // Simple query to ensure the pool is working (optional)
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('Database check: The answer to 1 + 1 is:', rows[0].solution);

        // Optional: Ensure the 'tasks' table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database table 'tasks' checked/created.");

    } catch (error) {
        console.error('Failed to initialize database connection or setup:', error.message);
        // Exit the process if the database connection fails
        process.exit(1);
    }
}

// --- 4. API Endpoints ---

// GET /api/tasks: Retrieve all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        // SQL injection safety: The mysql2 library automatically handles sanitization 
        // when using placeholders like ?, but here we use a static query.
        const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        // Send the query results back as a JSON array
        res.status(200).json(tasks);
    } catch (error) {
        console.error('GET /api/tasks error:', error.message);
        res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
});

// POST /api/tasks: Insert a new task
app.post('/api/tasks', async (req, res) => {
    const { title, description } = req.body;

    // Basic input validation
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const query = 'INSERT INTO tasks (title, description) VALUES (?, ?)';
        // The second argument [title, description] is sanitized by mysql2 before execution
        const [result] = await pool.query(query, [title, description]);
        console.log('result is = '+ result);

        // Send a successful response with the newly created ID
        res.status(201).json({
            message: 'Task created successfully',
            id: result.insertId,
            title,
            description
        });
    } catch (error) {
        console.error('POST /api/tasks error:', error.message);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// --- 5. Start Server ---
// Start the database connection, then start the Express server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`\nTest the APIs:`);
        console.log(`GET: http://localhost:${PORT}/api/tasks`);
        console.log(`POST (send JSON body to): http://localhost:${PORT}/api/tasks`);
    });
});