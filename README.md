# ScreenIQ — Backend + Database + Next.js

Separate project: multi-tenant B2B SaaS for data management, analytics, and reporting (media & entertainment). PostgreSQL + Express API + Next.js frontend.

## Tech stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Frontend**: Next.js 14, Tailwind CSS, TypeScript

## Quick start

### 1. Database

Create a PostgreSQL database:

```bash
createdb screeniq
```

Use a `.env` in `backend/` with your URL, e.g.:

`DATABASE_URL=postgresql://user:password@localhost:5432/screeniq`

### 2. Backend

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

API: **http://localhost:4000** — health: `GET /api/health`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: **http://localhost:3000**

### 4. Use the app

Open http://localhost:3000 → Sign up → use Dashboard, Movies, Reports, Users.

## Project layout (inside `screeniq/`)

```
screeniq/
├── backend/          # Express API, migrations, PostgreSQL
├── frontend/         # Next.js App Router
└── README.md         # this file
```

## Environment

- **backend/.env**: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`
- **frontend/.env.local** (optional): `NEXT_PUBLIC_API_URL=http://localhost:4000`

See **backend/README.md** for API endpoints and details.
