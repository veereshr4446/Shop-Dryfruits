# Shop-DryFruits

Kishmish shop website.

- `index.html` – public page
- `admin.html` – owner page (`/admin.html`), password only, stays logged in on that phone
- `api/products.js`, `api/admin.js` – server code (Vercel)
- `products.json` – shop name, WhatsApp number and starting items

Vercel setup: add a **Blob** store (Storage tab, Public) and an `ADMIN_PASSWORD` environment variable, then redeploy.
