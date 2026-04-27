Implementation notes and next steps
---------------------------------
This scaffold is minimal. To complete the project described:

Frontend:
- Wire sw-register.js into index.html (include script tag)
- Add icons to public/icons/
- Implement full cart UI, optimistic updates and enqueue actions into IndexedDB
- When online, replay queue by posting to /api/orders with generated clientOrderId
- Implement background sync in service worker with robust IDB usage (idb in SW scope)

Backend:
- Add authentication (JWT), input validation, and transactions for stock changes
- Make order endpoint idempotent using clientOrderId (already scaffolded)
- Add pagination, search, and image hosting (or CDN)

Testing:
- Use Lighthouse to audit PWA criteria
- Write E2E tests (Cypress / Playwright) to simulate offline interactions

Security:
- Use HTTPS for PWA installability. For local dev use mkcert to create localhost certs and configure Vite.
