-- ==========================================================
-- SCHEMA: Task Manager Database
-- Project 3 — Database Integration
-- ==========================================================
-- Relationship: One User has Many Tasks (1:Many)
-- ==========================================================

CREATE TABLE IF NOT EXISTS users (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  user_id    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notes on design decisions:
--
-- users.email is UNIQUE + NOT NULL
--   -> prevents two accounts with the same email (data integrity)
--
-- tasks.user_id is a FOREIGN KEY -> users.id
--   -> this is the "structural glue" binding tasks to their owner
--   -> ON DELETE CASCADE: deleting a user auto-deletes their tasks,
--      so we never end up with orphaned rows pointing to nothing
--
-- tasks.done uses CHECK (done IN (0,1))
--   -> SQLite has no native boolean type, so we enforce it strictly
--      at the schema level instead of trusting application code
--
-- Both tables use AUTOINCREMENT primary keys
--   -> guarantees every row has a unique, stable identifier
