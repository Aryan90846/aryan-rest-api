# Aryan's REST API — Node.js, Express & MongoDB

**Author:** Aryan  
**Stack:** Node.js · TypeScript · Express 5 · MongoDB · Mongoose · Zod

---

## Project Overview

A production-ready REST API backend demonstrating professional backend engineering skills. Built from the ground up with a scalable monorepo architecture, contract-first API design, and comprehensive CRUD operations for users, posts, and comments.

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

## Project Structure

```
aryan-rest-api/
├── src/
│   ├── app.ts                   # Express app + MongoDB connection
│   ├── index.ts                 # Entry point
│   ├── lib/
│   │   ├── errors.ts            # AppError class + centralized error handler
│   │   ├── pagination.ts        # Reusable pagination helpers
│   │   └── slugify.ts           # URL-safe slug generator
│   └── routes/
│       ├── health.ts            # GET /api/healthz
│       ├── users.ts             # Full CRUD /api/users
│       ├── posts.ts             # Full CRUD /api/posts
│       └── comments.ts          # CRUD for comments
├── models/
│   ├── User.ts                  # Mongoose schema + Zod validation
│   ├── Post.ts                  # Mongoose schema + Zod validation
│   └── Comment.ts               # Mongoose schema + Zod validation
├── openapi.yaml                 # OpenAPI 3.1 API contract
├── README.md                    # This file
└── package.json
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
| `GET` | `/api/users` | List users — pagination, search, role filter |
| `POST` | `/api/users` | Create a new user |
| `GET` | `/api/users/:id` | Get user by ID (includes post count) |
| `PUT` | `/api/users/:id` | Update user fields |
| `DELETE` | `/api/users/:id` | Soft-delete user (`isActive: false`) |
| `GET` | `/api/users/:id/posts` | Get paginated posts by user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts` | List posts — pagination, search, filter, sort |
| `POST` | `/api/posts` | Create post (auto-generates URL slug) |
| `GET` | `/api/posts/:id` | Get post (auto-increments view count) |
| `PUT` | `/api/posts/:id` | Update post |
| `DELETE` | `/api/posts/:id` | Delete post + cascade deletes comments |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/posts/:id/comments` | Get paginated comments for a post |
| `POST` | `/api/posts/:id/comments` | Add a comment |
| `PUT` | `/api/comments/:id` | Update a comment |
| `DELETE` | `/api/comments/:id` | Delete a comment |

---

## Features

- **Full CRUD** — Users, Posts, Comments with correct HTTP status codes
- **Pagination** — All lists return `{ data, meta }` with `total`, `page`, `totalPages`, `hasNextPage`, `hasPrevPage`
- **Search** — Regex search on name/email (users) and title/content (posts)
- **Filtering** — Filter by role, post status (`draft` / `published` / `archived`), category
- **Sorting** — Sort posts by `createdAt`, `updatedAt`, `title`, or `viewCount` (`asc`/`desc`)
- **Input Validation** — Zod schemas with field-level error messages
- **Soft Deletes** — Users are deactivated instead of removed from the database
- **Auto Slug** — URL-friendly slugs auto-generated from post titles
- **View Count** — Auto-increments on every `GET /posts/:id`
- **Cascade Deletes** — Deleting a post removes all its comments
- **Populated Relations** — Posts and comments embed full author data
- **Conflict Detection** — Duplicate emails return `409 Conflict`
- **Consistent Errors** — All errors return `{ error, message, details? }`

---

## MongoDB Schema Design

### Users Collection
```
{ name, email* (unique), role (enum: admin/user/moderator), bio, avatarUrl, isActive, timestamps }
Indexes: email, role, full-text (name + email)
```

### Posts Collection
```
{ title, slug* (unique), content, excerpt, status (enum: draft/published/archived),
  category, tags[], viewCount, authorId (ref→User), timestamps }
Indexes: slug, status, authorId, category, full-text (title + content)
```

### Comments Collection
```
{ content, postId (ref→Post), authorId (ref→User), timestamps }
Indexes: postId, authorId
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `PORT` | Server port |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variable
export MONGODB_URI="mongodb+srv://..."

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Example Requests

```bash
# Create a user
curl -X POST /api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Aryan", "email": "aryan@example.com", "role": "admin"}'

# List published posts sorted by views
curl "/api/posts?status=published&sortBy=viewCount&order=desc"

# Search users
curl "/api/users?search=aryan&role=admin"

# Paginated comments
curl "/api/posts/64abc123/comments?page=1&limit=20"
```

---

## Deployment

This is a **Node.js Express server** and can be deployed to:

- **[Railway](https://railway.app)** — Connect GitHub repo, set `MONGODB_URI`, deploy in one click
- **[Render](https://render.com)** — Free tier available, native Node.js support
- **[Fly.io](https://fly.io)** — Great performance, simple CLI deploy
- **[Cyclic](https://cyclic.sh)** — Built specifically for Node.js APIs

> **Note:** Netlify and Vercel are designed for static sites and serverless functions. A full Express server deploys best to Railway, Render, or Fly.io.
