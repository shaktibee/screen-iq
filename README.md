# ScreenIQ — Auth-only (clean branch)

This branch has **only login and signup**. The database is minimal (organizations, roles, users, user_organizations). Screens will be added one by one.

## Tech stack

- **Backend**: Node.js, Express (auth API only)
- **Database**: PostgreSQL (4 tables)
- **Frontend**: Next.js 14, Tailwind CSS, TypeScript (login, signup, minimal dashboard)

## Quick start

### 1. Clean database

Create a new PostgreSQL database (or drop existing and recreate for a clean state):

```bash
createdb screeniq
# If you had data before and want a clean slate:
# psql -d screeniq -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

In `backend/` add `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/screeniq
JWT_SECRET=your-secret-at-least-32-chars
PORT=4000
```

### 2. Backend

```bash
cd backend
npm install
npm run db:migrate    # Creates auth tables only
npm run db:seed       # Optional: demo user admin@demo.com / password123
npm run dev
```

API: **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: **http://localhost:3000**

### 4. Use the app

- **Sign up**: Create an account (creates your org and logs you in).
- **Log in**: Use your email and password, or demo **admin@demo.com** / **password123** if you ran seed.
- After login you’ll see a minimal dashboard; new screens will be added here as we build them.

## Project layout

```
screeniq/
├── backend/          # Express API (auth + health only), migrations, seed
├── frontend/         # Next.js: login, signup, dashboard placeholder
└── README.md
```

## Environment

- **backend/.env**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (optional), `PORT`
- **frontend/.env.local** (optional): `NEXT_PUBLIC_API_URL=http://localhost:4000`
