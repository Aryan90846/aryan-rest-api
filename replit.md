# Aryan's REST API

See README.md for full project documentation.

## Quick Reference

- **Stack:** Node.js, Express 5, MongoDB, Mongoose, TypeScript, Zod
- **Entry:** `artifacts/api-server/src/index.ts`
- **Models:** `lib/db/src/models/` (User, Post, Comment)
- **Routes:** `artifacts/api-server/src/routes/`
- **Env var needed:** `MONGODB_URI`
- **Dev command:** `pnpm --filter @workspace/api-server run dev`
- **Codegen:** `pnpm --filter @workspace/api-spec run codegen`
