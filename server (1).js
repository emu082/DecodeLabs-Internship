const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = 3000;
app.use(express.json());

const db = new DatabaseSync(path.join(__dirname, 'app.db'));
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
db.exec('PRAGMA foreign_keys = ON;');

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (userCount.count > 0) return;

  const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  const insertTask = db.prepare('INSERT INTO tasks (text, done, user_id) VALUES (?, ?, ?)');

  const alice = insertUser.run('Alice', 'alice@email.com');
  const bob   = insertUser.run('Bob', 'bob@email.com');

  insertTask.run('Read the project brief', 1, alice.lastInsertRowid);
  insertTask.run('Design the schema', 0, alice.lastInsertRowid);
  insertTask.run('Set up the database', 0, bob.lastInsertRowid);
}
seedIfEmpty();

function validateUserInput(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Field "name" is required and must be a non-empty string.');
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    errors.push('Field "email" is required and must be a valid email address.');
  }
  return errors;
}

function validateTaskInput(body) {
  const errors = [];
  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
    errors.push('Field "text" is required and must be a non-empty string.');
  } else if (body.text.length > 120) {
    errors.push('Field "text" must be under 120 characters.');
  }
  if (body.done !== undefined && typeof body.done !== 'boolean') {
    errors.push('Field "done" must be true or false.');
  }
  if (!body.user_id || typeof body.user_id !== 'number') {
    errors.push('Field "user_id" is required and must be a number.');
  }
  return errors;
}

app.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.status(200).json({ success: true, count: users.length, data: users });
});

app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ success: false, error: `User with id ${id} not found.` });
  }
  res.status(200).json({ success: true, data: user });
});

app.get('/users/:id/tasks', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ success: false, error: `User with id ${id} not found.` });
  }

  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(id);
  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

app.post('/users', (req, res) => {
  const errors = validateUserInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
  }

  try {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const info = stmt.run(req.body.name.trim(), req.body.email.trim());
    const newUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'A user with that email already exists.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

app.get('/tasks', (req, res) => {
  const { done } = req.query;

  let rows;
  if (done === 'true') {
    rows = db.prepare('SELECT * FROM tasks WHERE done = 1').all();
  } else if (done === 'false') {
    rows = db.prepare('SELECT * FROM tasks WHERE done = 0').all();
  } else {
    rows = db.prepare('SELECT * FROM tasks').all();
  }

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ success: false, error: `Task with id ${id} not found.` });
  }
  res.status(200).json({ success: true, data: task });
});

app.post('/tasks', (req, res) => {
  const errors = validateTaskInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.body.user_id);
  if (!user) {
    return res.status(400).json({ success: false, error: `user_id ${req.body.user_id} does not exist.` });
  }

  const stmt = db.prepare('INSERT INTO tasks (text, done, user_id) VALUES (?, ?, ?)');
  const info = stmt.run(req.body.text.trim(), req.body.done ? 1 : 0, req.body.user_id);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({ success: true, data: newTask });
});

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ success: false, error: `Task with id ${id} not found.` });
  }

  const errors = [];
  if (req.body.text !== undefined) {
    if (typeof req.body.text !== 'string' || req.body.text.trim().length === 0) {
      errors.push('Field "text" must be a non-empty string.');
    }
  }
  if (req.body.done !== undefined && typeof req.body.done !== 'boolean') {
    errors.push('Field "done" must be true or false.');
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: errors });
  }

  const newText = req.body.text !== undefined ? req.body.text.trim() : existing.text;
  const newDone = req.body.done !== undefined ? (req.body.done ? 1 : 0) : existing.done;

  db.prepare('UPDATE tasks SET text = ?, done = ? WHERE id = ?').run(newText, newDone, id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  res.status(200).json({ success: true, data: updated });
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ success: false, error: `Task with id ${id} not found.` });
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
  console.log(`✅ Task API (with SQLite database) running at http://localhost:${PORT}`);
});
