# Offline-First PWA Storefront (Minimal Scaffold)

This scaffold contains a minimal, working starter for:
- Frontend: React (Vite) PWA with service worker, IndexedDB queue (idb), manifest.
- Backend: Node.js + Express + Mongoose (MongoDB) with products and orders endpoints.
- Dev: Docker Compose for api + mongo, .env example.

**How to run (local dev)**

1. Backend
   - `cd api`
   - `npm install`
   - create `.env` (see `.env.example`) and run `npm run dev` (uses nodemon)

2. Frontend
   - `cd web`
   - `npm install`
   - `npm run dev` (Vite dev server on HTTPS if configured)

3. Docker (alternative)
   - `docker-compose up --build` (starts api + mongo)

This scaffold is intentionally minimal. See `docs` folder for architecture notes and next steps.
