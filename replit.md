# Backend REST API — Node.js, Express & MongoDB

**Author:** Aryan  
**Stack:** Node.js · TypeScript · Express 5 · MongoDB · Mongoose · Zod

---

## Project Overview

A production-ready REST API backend demonstrating professional backend engineering skills. Built from the ground up with a scalable monorepo architecture, contract-first API design, and comprehensive CRUD operations for a multi-resource domain (users, posts, comments).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict) |
| Framework | Express 5 |
| Database | MongoDB (Mongoose ODM) |
| Validation | Zod v4 |
| API Contract | OpenAPI 3.1 |
| Monorepo | pnpm workspaces |
| Build | esbuild |

---

## Architecture

```
rest-api/
├── artifacts/
│   └── api-server/              # Express REST API server
│       └── src/
│           ├── app.ts           # Express app + MongoDB connection bootstrap
│           ├── index.ts         # Entry point (reads PORT, starts server)
│           ├── lib/
│           │   ├── errors.ts    # AppError class + centralized error handler
│           │   ├── pagination.ts # Reusable pagination helpers
│           │   └── slugify.ts   # URL-safe slug generator
│           └── routes/
│               ├── index.ts     # Router registration
│               ├── health.ts    # GET /api/healthz (includes DB status)
│               ├── users.ts     # Full CRUD /api/users
│               ├── posts.ts     # Full CRUD /api/posts
│               └── comments.ts  # CRUD /api/posts/:id/comments
├── lib/
│   ├── api-spec/openapi.yaml    # OpenAPI 3.1 — single source of truth
│   ├── api-zod/                 # Auto-generated Zod validators
│   ├── api-client-react/        # Auto-generated React Query hooks
│   └── db/
│       └── src/
│           ├── index.ts         # connectDB() + model re-exports
│           └── models/
│               ├── User.ts      # Mongoose schema, model, Zod schemas
│               ├── Post.ts      # Mongoose schema, model, Zod schemas
│               └── Comment.ts   # Mongoose schema, model, Zod schemas
```

---

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/healthz` | Server health + MongoDB connection status + uptime |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List users with pagination, search, role filter |
| `POST` | `/api/users` | Create a new user |
| `GET` | `/api/users/:id` | Get user by ID (includes post count) |
| `PUT` | `/api/users/:id` | Update user fields |
| `DELETE` | `/api/users/:id` | Soft-delete (sets `isActive: false`) |
| `GET` | `/api/users/:id/posts` | Get paginated posts authored by user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List posts with pagination, search, filter, sort |
| `POST` | `/api/posts` | Create post (auto-generates URL slug) |
| `GET` | `/api/posts/:id` | Get post by ID (auto-increments view count) |
| `PUT` | `/api/posts/:id` | Update post |
| `DELETE` | `/api/posts/:id` | Delete post + cascades to its comments |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts/:id/comments` | Get paginated comments for a post |
| `POST` | `/api/posts/:id/comments` | Add comment to post |
| `PUT` | `/api/comments/:id` | Update comment |
| `DELETE` | `/api/comments/:id` | Delete comment |

---

## Key Features

- **Full CRUD** — Users, Posts, Comments with proper HTTP status codes
- **Pagination** — All list endpoints return `{ data, meta }` with `total`, `page`, `totalPages`, `hasNextPage`, `hasPrevPage`
- **Search** — Regex-based search on name/email (users) and title/content (posts)
- **Filtering** — Filter by role, post status (`draft` / `published` / `archived`), category
- **Sorting** — Sort posts by `createdAt`, `updatedAt`, `title`, or `viewCount` in `asc`/`desc` order
- **Validation** — Zod input validation with field-level error messages returned to the client
- **Soft Deletes** — Users are deactivated (`isActive: false`) rather than deleted
- **Auto Slug Generation** — URL-friendly slugs auto-generated from post titles
- **View Count Tracking** — Post view count increments on every `GET /posts/:id`
- **Cascade Deletes** — Deleting a post automatically deletes its comments
- **Populate / Relations** — Posts and comments include full embedded author data
- **Conflict Detection** — Duplicate emails return `409 Conflict`
- **Consistent Error Format** — All errors return `{ error, message, details? }`

---

## MongoDB Schema Design

### Users Collection
```
{ name, email (unique, indexed), role (enum), bio, avatarUrl, isActive, timestamps }
```
Indexes: `email`, `role`, `{ name: "text", email: "text" }` (full-text search)

### Posts Collection
```
{ title, slug (unique), content, excerpt, status (enum), category, tags[], viewCount, authorId (ref), timestamps }
```
Indexes: `slug`, `status`, `authorId`, `category`, `{ title: "text", content: "text" }`

### Comments Collection
```
{ content, postId (ref), authorId (ref), timestamps }
```
Indexes: `postId`, `authorId`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g. `mongodb+srv://...`) |
| `PORT` | Server port (assigned automatically) |

---

## Development

```bash
# Install dependencies
pnpm install

# Start the API server
pnpm --filter @workspace/api-server run dev

# Regenerate types from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Typecheck the entire workspace
pnpm run typecheck
```

---

## Example Requests

```bash
# Create a user
POST /api/users
{ "name": "Aryan", "email": "aryan@example.com", "role": "admin" }

# Search published posts, sorted by views
GET /api/posts?status=published&sortBy=viewCount&order=desc

# Paginated comments on a post
GET /api/posts/64abc123/comments?page=1&limit=20

# Search users by name
GET /api/users?search=aryan&role=admin
```
