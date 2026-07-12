# Auth API — Project 4 (User Authentication System)

Extends Project 3's database-backed Task API with a full authentication
layer: registration, login, password hashing, and JWT-protected routes.

## Run it locally

```bash
npm install
node server.js
```

Server starts at `http://localhost:3000`. A file `auth.db` is created
automatically on first run.

## How authentication works here

1. **Register** — password is hashed with `bcrypt` before it ever touches
   the database. The plain password is never stored anywhere.
2. **Login** — server compares the submitted password against the stored
   hash using `bcrypt.compare()`, then issues a **JWT** (JSON Web Token)
   valid for 2 hours.
3. **Protected routes** — every `/tasks` route requires the token to be
   sent as `Authorization: Bearer <token>`. A middleware function verifies
   the token before the request reaches the route handler.
4. **Ownership checks** — a user can only update or delete their *own*
   tasks. Trying to touch someone else's task returns `403 Forbidden`,
   even with a perfectly valid token.

## Endpoints

| Method | Route            | Auth required? | Description                     | Status |
|--------|------------------|-----------------|----------------------------------|--------|
| POST   | `/auth/register` | No              | Create an account                | 201    |
| POST   | `/auth/login`    | No              | Log in, receive a JWT            | 200    |
| GET    | `/auth/me`       | Yes             | Get your own profile             | 200    |
| GET    | `/tasks`         | Yes             | List your own tasks              | 200    |
| POST   | `/tasks`         | Yes             | Create a task                    | 201    |
| PUT    | `/tasks/:id`     | Yes             | Update your own task             | 200    |
| DELETE | `/tasks/:id`     | Yes             | Delete your own task             | 204    |

## Status codes that matter here

| Status | Meaning in this API                                     |
|--------|-----------------------------------------------------------|
| 401    | Missing token, malformed token, invalid/expired token, or wrong login credentials |
| 403    | Valid token, but trying to touch a resource you don't own  |
| 400    | Validation failure (weak password, duplicate email, etc.)  |

## Try it with curl

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Dana", "email": "dana@email.com", "password": "mypassword123"}'

# Login — copy the token from the response
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dana@email.com", "password": "mypassword123"}'

# Use the token to access a protected route
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer PASTE_YOUR_TOKEN_HERE"
```

## Security notes

- Passwords are hashed with `bcrypt` (10 salt rounds) — verified by
  inspecting the database directly: stored values look like
  `$2b$10$gnr7mZ...`, never the original password.
- `JWT_SECRET` is read from an environment variable, with a dev fallback.
  **In production, always set a real secret** — never ship the default.
- All database queries remain parameterized (carried over from Project 3),
  so this API is also safe from SQL injection.
