# AAHDC Lottery Platform

This repository is a monorepo for the AAHDC Lottery Platform, containing both backend (Express/Node.js) and frontend (React) applications.

## Repository Structure

```
aahdc-lottery-platform-v1/
├── backend/   # Express API, serverless-ready
├── frontend/  # React app (Create React App)
```

---

## Backend (`backend/`)

- **Tech Stack:** Node.js, Express, Sequelize (PostgreSQL), JWT, Multer, PDFKit, ExcelJS
- **Entry Points:**
  - `server.js` – Main Express app
  - `api/index.js` – Serverless function entry for Vercel
- **Key Folders:**
  - `models/` – Sequelize models (AllocatedUnit, Candidate, Unit, User)
  - `src/controllers/` – Route controllers
  - `src/routes/` – API route definitions
  - `src/services/` – Business logic/services
  - `config/` – Database config
- **Environment Variables:** See `.env.example`
- **Deployment:** Vercel serverless (see `vercel.json` and `DEPLOY.md`)
- **API Endpoints:** `/api/auth`, `/api/units`, `/api/allocation`, `/api/reports`, `/api/candidates`

---

## Frontend (`frontend/`)

- **Tech Stack:** React (Create React App)
- **Key Folders:**
  - `src/components/` – Reusable UI components
  - `src/pages/` – Page-level components
  - `src/services/` – API service modules
- **Environment Variables:** See `.env.example`
- **Deployment:** Vercel static build (see `vercel.json` and `DEPLOY.md`)
- **API Base URL:** Set via `REACT_APP_API_BASE_URL` in environment variables

---

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## Deployment

- Both apps are deployed separately on Vercel.
- See `DEPLOY.md` in each folder for step-by-step deployment instructions.

---

## Environment Variables

- **Backend:** `.env.example` lists required variables (DB connection, JWT secret, CORS origins).
- **Frontend:** `.env.example` lists required variables (API base URL).

---

## Troubleshooting

- **CORS errors:** Ensure `FRONTEND_ORIGIN` in backend matches deployed frontend URL.
- **500 errors:** Check Vercel logs for missing environment variables or runtime errors.

---

## License


