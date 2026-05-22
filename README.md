# DevPulse

DevPulse is an internal tech issue and feature tracker API for software teams. Contributors can report bugs or feature requests, while maintainers can manage issue workflow and cleanup.

## Live URL

Add your deployed backend URL here after deployment:

```text
https://devpulse-api.vercel.app
```

## Features

- User signup and login with JWT authentication
- Password hashing with bcrypt
- Contributor and maintainer role authorization
- Issue creation, listing, filtering, sorting, update, and delete
- PostgreSQL database using native `pg` and raw SQL only
- Modular Express architecture with TypeScript strict mode

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- pg
- bcrypt
- jsonwebtoken
- http-status-codes
- cors

## Project Structure

```text
src/
  config/
  db/
  middleware/
  modules/
    auth/
    issues/
  routes/
  types/
  utils/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Add your PostgreSQL connection string and JWT secret:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/devpulse
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

4. Run the development server:

```bash
npm run dev
```

The API will run at:

```text
http://localhost:5000
```

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Public | Register a user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/issues` | Authenticated | Create an issue |
| GET | `/api/issues?sort=newest&type=bug&status=open` | Public | Get all issues |
| GET | `/api/issues/:id` | Public | Get one issue |
| PATCH | `/api/issues/:id` | Maintainer, or contributor's own open issue | Update issue fields |
| DELETE | `/api/issues/:id` | Maintainer only | Delete issue |

Use this header for protected routes:

```http
Authorization: <JWT_TOKEN>
```

`Bearer <JWT_TOKEN>` is also accepted for convenience.

## Request Examples

### Signup

```json
{
  "name": "John Doe",
  "email": "john.doe@devpulse.com",
  "password": "securePassword123",
  "role": "contributor"
}
```

### Login

```json
{
  "email": "john.doe@devpulse.com",
  "password": "securePassword123"
}
```

### Create Issue

```json
{
  "title": "Database connection timeout under load",
  "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
  "type": "bug"
}
```

### Update Issue

```json
{
  "title": "Updated: Database pool exhaustion fix needed",
  "description": "Updated description with reproduction steps...",
  "type": "bug",
  "status": "in_progress"
}
```

## Database Schema Summary

### users

| Field | Type | Notes |
| --- | --- | --- |
| id | SERIAL | Primary key |
| name | VARCHAR(120) | Required |
| email | VARCHAR(180) | Required, unique |
| password | TEXT | Required, hashed |
| role | VARCHAR(20) | `contributor` or `maintainer`, default `contributor` |
| created_at | TIMESTAMP | Defaults to current time |
| updated_at | TIMESTAMP | Auto-refreshes on update |

### issues

| Field | Type | Notes |
| --- | --- | --- |
| id | SERIAL | Primary key |
| title | VARCHAR(150) | Required |
| description | TEXT | Required, minimum 20 characters |
| type | VARCHAR(30) | `bug` or `feature_request` |
| status | VARCHAR(30) | `open`, `in_progress`, or `resolved`; default `open` |
| reporter_id | INTEGER | Validated in application logic |
| created_at | TIMESTAMP | Defaults to current time |
| updated_at | TIMESTAMP | Auto-refreshes on update |

## Scripts

```bash
npm run dev
npm run build
npm start
npm run typecheck
```

## Deployment Notes

- Use NeonDB, Supabase, or another hosted PostgreSQL provider.
- Add `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `NODE_ENV` to your deployment environment variables.
- Build before deployment with `npm run build`.
