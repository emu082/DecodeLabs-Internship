# Task API + Database — Project 3 (Database Integration)

Extends Project 2's Task API by connecting it to a real **SQLite** database.
Data now survives server restarts, and two related tables demonstrate a
proper one-to-many relationship.

Uses Node.js's built-in `node:sqlite` module (Node 22+) — no external
database server or extra native dependencies to install.

## Run it locally

```bash
npm install
node server.js
```

Server starts at `http://localhost:3000`. A file called `app.db` will be
created automatically on first run, seeded with 2 users and 3 tasks.

## Schema (see `schema.sql`)

```
users                          tasks
┌────┬───────┬───────────┐     ┌────┬──────┬──────┬─────────┬────────────┐
│ id │ name  │ email(UQ) │     │ id │ text │ done │ user_id │ created_at │
└────┴───────┴───────────┘     └────┴──────┴──────┴─────────┴────────────┘
     1 ──────────────────────────── many (FOREIGN KEY, ON DELETE CASCADE)
```

- `users.email` — `UNIQUE` + `NOT NULL` (no duplicate accounts)
- `tasks.user_id` — `FOREIGN KEY` referencing `users.id`, `ON DELETE CASCADE`
- `tasks.done` — `CHECK (done IN (0,1))` enforced at the schema level

## Endpoints

| Method | Route              | Description                          | Status |
|--------|--------------------|----------------------------------------|--------|
| GET    | `/users`           | List all users                         | 200    |
| GET    | `/users/:id`       | Get one user                           | 200    |
| GET    | `/users/:id/tasks` | Get all tasks belonging to a user      | 200    |
| POST   | `/users`           | Create a user                          | 201    |
| GET    | `/tasks`           | List all tasks (`?done=true` to filter)| 200    |
| GET    | `/tasks/:id`       | Get one task                           | 200    |
| POST   | `/tasks`           | Create a task (requires `user_id`)     | 201    |
| PUT    | `/tasks/:id`       | Update a task                          | 200    |
| DELETE | `/tasks/:id`       | Delete a task                          | 204    |

## Security: SQL injection prevention

Every query uses **parameterized statements** — user input is never
concatenated directly into SQL strings.

```js
// Safe — input is passed separately as a parameter
db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

// Never done in this project — vulnerable to injection
db.exec(`SELECT * FROM tasks WHERE id = ${id}`);
```

This was verified by attempting to insert a task with the text
`Robert'); DROP TABLE tasks;--` — the malicious string was stored as
harmless plain text, and the `tasks` table was untouched.

## Try it with curl

```bash
# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Dana", "email": "dana@email.com"}'

# Create a task for that user
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Learn SQL", "user_id": 1}'

# Get all tasks belonging to a user
curl http://localhost:3000/users/1/tasks
```
