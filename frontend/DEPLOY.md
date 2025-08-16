# Deploying the Frontend (Create React App) on Vercel

This repository is a monorepo. The frontend lives under `frontend/` and is deployed as a static build on Vercel.

Key files:

- `frontend/vercel.json` – static build configuration
- `frontend/package.json` – build scripts
- `frontend/.env.example` – sample API base env
- `frontend/src/services/*` – all API calls use `REACT_APP_API_BASE_URL`

## 1) Create the Vercel project

- Import this Git repository into Vercel.
- Set Root Directory to `frontend`.
- Framework preset: Create React App.
- Build Command: `npm run build` (default is fine).
- Output Directory: `build` (configured in `frontend/vercel.json`).

## 2) Environment variables (required)

Set these in Vercel → Project Settings → Environment Variables:

- `REACT_APP_API_BASE_URL` – set to your backend URL: `https://<your-backend>.vercel.app`

Note: CRA only exposes environment variables prefixed with `REACT_APP_`.

## 3) Deploy and verify

- Trigger a deployment in Vercel.
- Open the site. Login and any API-driven actions should work and target the backend domain specified by `REACT_APP_API_BASE_URL`.
- Use the browser devtools Network tab to confirm requests point to the expected backend.

## 4) Local development

- Start the React dev server:

```bash
cd frontend
npm install
npm start
```

- The dev server runs on `http://localhost:3000` and proxies `/api` calls to `http://localhost:5000` (configured in `frontend/package.json`).
- Alternatively, you can set `REACT_APP_API_BASE_URL=http://localhost:5000` in a local `.env` if you prefer explicit URLs.

## 5) Troubleshooting

- If API calls fail with CORS errors, ensure the backend’s `FRONTEND_ORIGIN` env includes your deployed frontend domain.
- If API calls go to the wrong URL, double-check `REACT_APP_API_BASE_URL` in Vercel (and that you rebuilt after changes).
