# Deploying the Backend (Express + Serverless) on Vercel

This repository is a monorepo. The backend lives under `backend/` and is deployed as Vercel Serverless Functions.

Key files:

- `backend/api/index.js` – serverless entry that exports the Express app
- `backend/server.js` – Express app (exported for serverless, started only in non-production)
- `backend/vercel.json` – function/runtime config for Vercel
- `backend/config/config.js` – database config (env-only)
- `backend/.env.example` – example environment variables

## 1) Create the Vercel project

- Import this Git repository into Vercel.
- Set Root Directory to `backend`.
- Framework preset: Other.
- Build Command: none required (functions are deployed automatically).
- Output Directory: leave empty.
- Runtime/Node version: Node 18.x (configured in `backend/vercel.json`).
- Region: choose the region closest to your database (e.g., EU if your Postgres is in eu-central).

## 2) Environment variables (required)

Set these in Vercel → Project Settings → Environment Variables:

- `DATABASE_URL` – your Postgres connection string (with sslmode=require if needed)
- `JWT_SECRET` – a strong secret for signing JWTs
- `FRONTEND_ORIGIN` – e.g., `https://<your-frontend>.vercel.app` (add more via `FRONTEND_ORIGIN_2`, `FRONTEND_ORIGIN_3` if needed)

Notes:

- `VERCEL_URL` is auto-provided by Vercel and is included in allowed CORS origins automatically.
- Production disables automatic schema sync for safety and faster cold starts. Manage schema via migrations or manual SQL.

## 3) Deploy and verify

- Trigger a deployment in Vercel.
- Verify the health endpoint: open `https://<your-backend>.vercel.app/` – it should respond with: `AAHDC Lottery Platform Backend API is running!`
- Test an API route (e.g., `/api/auth/login`) using your credentials or Postman/curl.

## 4) CORS configuration

CORS allowed origins are controlled in `backend/server.js` using these envs:

- `FRONTEND_ORIGIN`, `FRONTEND_ORIGIN_2`, `FRONTEND_ORIGIN_3`
- `VERCEL_URL` (auto) → `https://<deployment-url>`

Ensure your deployed frontend domain is listed; otherwise browsers will block requests.

## 5) Local development

- Copy envs and start the server locally:

```bash
cp backend/.env.example backend/.env
# edit backend/.env with your DATABASE_URL and JWT_SECRET
cd backend
npm install
npm run dev
```

- The server listens on `http://localhost:5000` in development.
- The frontend dev server proxies `/api` to `http://localhost:5000` (configured in `frontend/package.json`).

## 6) Troubleshooting

- 500 errors on Vercel often indicate missing env vars or DB connectivity. Check the Functions logs.
- CORS errors: verify `FRONTEND_ORIGIN*` values and that you’re using the correct frontend URL.
- DB SSL: if your provider requires SSL, ensure `?sslmode=require` (or equivalent) is in your `DATABASE_URL`.
