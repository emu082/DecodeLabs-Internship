# Task API — Project 2 (Backend API Development)

A simple RESTful backend API built with **Node.js + Express**, continuing the
Task Manager app from Project 1. No database yet — data lives in memory
while the server is running (resets on restart).

## Run it locally

```bash
npm install
node server.js
```

Server starts at: `http://localhost:3000`

## Endpoints

| Method | Route          | Description                     | Success Status |
|--------|----------------|----------------------------------|-----------------|
| GET    | `/tasks`       | List all tasks                   | 200             |
| GET    | `/tasks?done=true` | Filter tasks by completion   | 200             |
| GET    | `/tasks/:id`   | Get a single task                | 200             |
| POST   | `/tasks`       | Create a new task                | 201             |
| PUT    | `/tasks/:id`   | Update an existing task           | 200             |
| DELETE | `/tasks/:id`   | Delete a task                     | 204             |

## Request body (POST / PUT)

```json
{ "text": "Buy groceries", "done": false }
```

- `text` — required, non-empty string, max 120 characters
- `done` — optional boolean, defaults to `false`

## Error responses

| Status | When it happens                          |
|--------|-------------------------------------------|
| 400    | Missing/invalid `text` or `done` field     |
| 404    | Task id doesn't exist, or unknown route    |
| 500    | Unexpected server error                    |

All responses are JSON — success responses use `{ success: true, data: ... }`,
errors use `{ success: false, error: ... }`.

## Try it with curl

```bash
# Get all tasks
curl http://localhost:3000/tasks

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Write tests"}'

# Mark a task done
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"text": "Write tests", "done": true}'

# Delete a task
curl -X DELETE http://localhost:3000/tasks/1
```
