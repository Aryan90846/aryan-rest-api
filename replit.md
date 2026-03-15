# Backend REST API — Node.js + Express + PostgreSQL

## Project Overview

A professional, production-ready REST API backend built with Node.js, Express, and PostgreSQL. Implements full CRUD operations for users, posts, and comments with pagination, search, filtering, sorting, structured error handling, and Zod input validation. Designed with a scalable monorepo architecture.

## Tech Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API contract**: OpenAPI 3.1 spec + Orval codegen
- **Build**: esbuild (CJS bundle)

## Architecture

```text
artifacts-monorepo/
├── artifacts/
│   └── api-server/              # Express REST API server
│       └── src/
│           ├── app.ts           # Express app setup + error handler
│           ├── index.ts         # Entry point (reads PORT, starts server)
│           ├── lib/
│           │   ├── errors.ts    # AppError class + error handler middleware
│           │   ├── pagination.ts # Pagination helpers
│           │   └── slugify.ts   # URL slug generator
│           └── routes/
│               ├── index.ts     # Router registration
│               ├── health.ts    # GET /api/healthz
│               ├── users.ts     # CRUD /api/users
│               ├── posts.ts     # CRUD /api/posts
│               └── comments.ts  # CRUD /api/posts/:id/comments, /api/comments/:id
├── lib/
│   ├── api-spec/openapi.yaml    # OpenAPI 3.1 source of truth
│   ├── api-zod/                 # Generated Zod validators (from codegen)
│   ├── api-client-react/        # Generated React Query hooks (from codegen)
│   └── db/
│       └── src/schema/
│           ├── users.ts         # Users table + Zod schemas
│           ├── posts.ts         # Posts table + Zod schemas
│           └── comments.ts      # Comments table + Zod schemas
```

## API Endpoints

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Server health + uptime |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users (pagination, search, role filter) |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user by ID (includes post count) |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Soft-delete user (sets isActive=false) |
| GET | `/api/users/:id/posts` | Get all posts by a user |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List posts (pagination, search, status/category filter, sort) |
| POST | `/api/posts` | Create post (auto-generates URL slug) |
| GET | `/api/posts/:id` | Get post by ID (increments view count) |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Hard-delete post |

### Comments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts/:id/comments` | Get comments for a post |
| POST | `/api/posts/:id/comments` | Add comment to post |
| PUT | `/api/comments/:id` | Update comment |
| DELETE | `/api/comments/:id` | Delete comment |

## Key Features

- **Full CRUD** for Users, Posts, Comments
- **Pagination** on all list endpoints with meta (total, pages, hasNext, hasPrev)
- **Search** by name/email (users) and title/content (posts)
- **Filtering** by role, status, category
- **Sorting** posts by createdAt, updatedAt, title, viewCount (asc/desc)
- **Input validation** with Zod — returns structured field-level errors
- **Soft deletes** for users (isActive flag)
- **Auto slug generation** for posts
- **View count tracking** on post reads
- **Relational queries** — posts include author, comments include author
- **Structured error responses** — consistent `{ error, message, details }` format
- **Role-based user system** — admin, moderator, user

## Database Schema

- **users** — id, name, email (unique), role (enum), bio, avatarUrl, isActive, timestamps
- **posts** — id, title, slug (unique), content, excerpt, status (enum), category, tags (array), viewCount, authorId (FK), timestamps
- **comments** — id, content, postId (FK with cascade delete), authorId (FK), timestamps

## Development

```bash
# Start the API server
pnpm --filter @workspace/api-server run dev

# Push schema changes to DB
pnpm --filter @workspace/db run push

# Regenerate API types from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Typecheck everything
pnpm run typecheck
```

## Query Examples

```bash
# List all published posts, sorted by views
GET /api/posts?status=published&sortBy=viewCount&order=desc

# Search users by name or email
GET /api/users?search=alice&role=admin

# Paginate comments
GET /api/posts/1/comments?page=2&limit=20
```
