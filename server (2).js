const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRY = '2h';
const SALT_ROUNDS = 10;

app.use(express.json());

const db = new DatabaseSync(path.join(__dirname, 'auth.db'));
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
db.exec('PRAGMA foreign_keys = ON;');

function validateRegisterInput(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Field "name" is required.');
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.push('Field "email" must be a valid email address.');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    errors.push('Field "password" is required and must be at least 8 characters.');
  }
  return errors;
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

app.post('/auth/register', async (req, res) => {
  const errors = validateRegisterInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
  }

  try {
    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

    const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(req.body.name.trim(), req.body.email.trim().toLowerCase(), passwordHash);

    const newUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'An account with that email already exists.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.status(200).json({
    success: true,
    data: { token, user: { id: user.id, name: user.name, email: user.email } },
  });
});

app.get('/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User no longer exists.' });
  }

  res.status(200).json({ success: true, data: user });
});

app.get('/tasks', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.user.id);
  res.status(200).json({ success: true, count: rows.length, data: rows });
});

app.post('/tasks', authenticate, (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Field "text" is required.' });
  }

  const stmt = db.prepare('INSERT INTO tasks (text, done, user_id) VALUES (?, 0, ?)');
  const info = stmt.run(text.trim(), req.user.id);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({ success: true, data: newTask });
});

app.put('/tasks/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ success: false, error: `Task with id ${id} not found.` });
  }

  if (task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You do not have permission to modify this task.' });
  }

  const newText = req.body.text !== undefined ? req.body.text.trim() : task.text;
  const newDone = req.body.done !== undefined ? (req.body.done ? 1 : 0) : task.done;

  db.prepare('UPDATE tasks SET text = ?, done = ? WHERE id = ?').run(newText, newDone, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  res.status(200).json({ success: true, data: updated });
});

app.delete('/tasks/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ success: false, error: `Task with id ${id} not found.` });
  }

  if (task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You do not have permission to delete this task.' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} does not exist.` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ Auth API running at http://localhost:${PORT}`);
});
