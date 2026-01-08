# Mock API for Projek Akhir RPL CMS

This folder contains a mock REST API. Two options are provided:

- Quick JSON-server mock (fast, basic CRUD) at `http://localhost:8080/api`.
- Express mock server (implements login, register, pendaftaran approval/reject) at `http://localhost:8080/api`.

Quick start (PowerShell):

```powershell
# Install dependencies (local devDependency)
npm install

# Or install json-server globally if preferred
npm install -g json-server

# Run json-server (quick)
npm run start:api

# Or run json-server directly (global install)
json-server --watch db.json --port 8080 --routes routes.json

# Run Express mock server (supports login/register/approve/reject)
npm install
npm run start:server
```

Available endpoints (examples):

- GET  /api/kegiatan
- GET  /api/ukm
- GET  /api/pendaftaran
- GET  /api/users
- POST /api/login      (json-server will echo; frontend expects a user object)
- POST /api/register   (adds a user)

Notes:
- `routes.json` maps `/api/*` to the root collections in `db.json` so the frontend's `API_BASE = 'http://localhost:8080/api'` works without code changes.
- json-server provides basic CRUD; some frontend actions (approve/reject) may need more advanced behavior. For quick testing this mock is sufficient.

The `server.js` Express implementation is already included. Use `npm run start:server` to run it. It persists to `db.json` and implements:

- POST `/api/login` — authenticate with `username` and `password`.
- POST `/api/register` — create mahasiswa account.
- GET `/api/kegiatan`, GET `/api/ukm`, GET `/api/pendaftaran` (filter by `?mahasiswa=`).
- POST `/api/pendaftaran` — create new pendaftaran (status `pending`).
- POST `/api/pendaftaran/:id/approve` and `/api/pendaftaran/:id/reject` — admin actions.

Both `json-server` and `server.js` run on port `8080` by default — run one at a time.
