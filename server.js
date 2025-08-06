const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('./data.db');

// Create tables if not exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    panelAdmin INTEGER DEFAULT 0,
    panelUser INTEGER DEFAULT 0,
    panelLogs INTEGER DEFAULT 0,
    canDelete INTEGER DEFAULT 0,
    canCreate INTEGER DEFAULT 0,
    canEdit INTEGER DEFAULT 0,
    canViewLogs INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin TEXT,
    targetUser TEXT,
    action TEXT,
    details TEXT,
    time TEXT
)`);
db.run(`ALTER TABLE roles ADD COLUMN emoji TEXT`, () => {});

// Insert a hardcoded user if not exists
const insertHardcodedUser = async (username, password, role) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => { // Remove .toLowerCase()
        if (!row) {
            const hash = await bcrypt.hash(password, 10);
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role]);
        }
    });
};
insertHardcodedUser('hayden', 'Cheetah41', 'Admin');
//insertHardcodedUser('admin', 'admin123', 'Admin');

// Insert a default admin role if none exist
db.get('SELECT * FROM roles WHERE name = ?', ['Admin'], (err, row) => {
    if (!row) {
        db.run(
            'INSERT INTO roles (name, panelAdmin, panelUser, panelLogs, canDelete, canCreate, canEdit, canViewLogs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Admin', 1, 1, 1, 1, 1, 1, 1],
            function (err) {
                if (err) console.error('Error inserting admin role:', err.message);
            }
        );
    }
});

// --- API ENDPOINTS ---

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a user
app.post('/api/users', async (req, res) => {
    let { username, password, role } = req.body;
    username = username.trim(); // <-- Remove .toLowerCase()
    const hash = await bcrypt.hash(password, 10);
    db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hash, role],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Get all roles
app.get('/api/roles', (req, res) => {
    db.all('SELECT * FROM roles', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a role
app.post('/api/roles', (req, res) => {
    const { name, panelAdmin, panelUser, panelLogs, canDelete, canCreate, canEdit, canViewLogs } = req.body;
    db.run(
        'INSERT INTO roles (name, panelAdmin, panelUser, panelLogs, canDelete, canCreate, canEdit, canViewLogs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, panelAdmin ? 1 : 0, panelUser ? 1 : 0, panelLogs ? 1 : 0, canDelete ? 1 : 0, canCreate ? 1 : 0, canEdit ? 1 : 0, canViewLogs ? 1 : 0],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Get all logs
app.get('/api/logs', (req, res) => {
    db.all('SELECT * FROM logs ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a log
app.post('/api/logs', (req, res) => {
    const { admin, targetUser, action, details, time } = req.body;
    db.run(
        'INSERT INTO logs (admin, targetUser, action, details, time) VALUES (?, ?, ?, ?, ?)',
        [admin, targetUser, action, details, time],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Login endpoint
app.post('/api/users/login', (req, res) => {
    let { username, password } = req.body;
    username = username.trim(); // <-- Remove .toLowerCase()
    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Invalid credentials' });
            res.json({ id: user.id, username: user.username, role: user.role });
        }
    );
});

// Update a user
app.put('/api/users/:id', async (req, res) => {
    let { username, password, role } = req.body;
    username = username.trim(); // <-- Remove .toLowerCase()

    if (password && password.trim() !== "") {
        // If a new password is provided, hash and update it
        const hash = await bcrypt.hash(password, 10);
        db.run(
            `UPDATE users SET username=?, password=?, role=? WHERE id=?`,
            [username, hash, role, req.params.id],
            function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ changes: this.changes });
            }
        );
    } else {
        // If password is blank, don't change it
        db.run(
            `UPDATE users SET username=?, role=? WHERE id=?`,
            [username, role, req.params.id],
            function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ changes: this.changes });
            }
        );
    }
});

// Delete a user
app.delete('/api/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE id=?', [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// Update a role
app.put('/api/roles/:id', (req, res) => {
    const { name, panelAdmin, panelUser, panelLogs, canDelete, canCreate, canEdit, canViewLogs, oldName } = req.body;
    db.run(
        `UPDATE roles SET name=?, panelAdmin=?, panelUser=?, panelLogs=?, canDelete=?, canCreate=?, canEdit=?, canViewLogs=? WHERE id=?`,
        [name, panelAdmin ? 1 : 0, panelUser ? 1 : 0, panelLogs ? 1 : 0, canDelete ? 1 : 0, canCreate ? 1 : 0, canEdit ? 1 : 0, canViewLogs ? 1 : 0, req.params.id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            // Update all users with the old role name to the new one
            db.run(
                `UPDATE users SET role=? WHERE role=?`,
                [name, oldName],
                function (err2) {
                    if (err2) return res.status(400).json({ error: err2.message });
                    res.json({ changes: this.changes });
                }
            );
        }
    );
});

// Delete a role
app.delete('/api/roles/:id', (req, res) => {
    db.run('DELETE FROM roles WHERE id=?', [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

async function deleteRole(roleName) {
    const role = rolesData[roleName];
    if (!role) return;
    await fetch(`http://localhost:5089/api/roles/${role.id}`, { method: "DELETE" });
    loadRoles();
}

// --- START SERVER ---
app.listen(5089, () => {
    console.log('API running on http://localhost:5089');
});

