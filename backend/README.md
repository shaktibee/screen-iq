# ScreenIQ Backend

Node.js + Express + PostgreSQL API for the ScreenIQ multi-tenant SaaS MVP.

## Setup

1. **Node**: Use Node 18+.

2. **PostgreSQL**: Create a database, e.g.:
   ```bash
   createdb screeniq
   ```

3. **Environment**: Copy env example and set values.
   - Create a file `.env` in the `backend` folder with:
   ```
   NODE_ENV=development
   PORT=4000
   DATABASE_URL=postgresql://user:password@localhost:5432/screeniq
   JWT_SECRET=your-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   UPLOAD_DIR=./uploads
   ```

4. **Install and migrate**:
   ```bash
   cd backend
   npm install
   npm run db:migrate
   ```

5. **Run**:
   ```bash
   npm run dev
   ```
   API base: `http://localhost:4000`. Health: `GET /api/health`.

## Main endpoints

- `POST /api/auth/signup` – sign up (creates user + default org)
- `POST /api/auth/login` – login (returns user + JWT)
- `GET /api/auth/me` – current user (Bearer token required)
- `GET /api/projects` – list projects (movies) (auth + org)
- `POST /api/projects` – create project (Admin/Analyst)
- `GET /api/regions` – list regions; `POST /api/regions`, `PATCH /api/regions/:id`, `DELETE /api/regions/:id`
- `GET /api/cinema-chains` – list cinema chains; `POST`, `PATCH`, `DELETE` by id
- `GET /api/theaters` – list theaters (optional `?cinema_chain_id=`, `?region_id=`); `POST`, `PATCH`, `DELETE` by id
- `GET /api/screens` – list screens (optional `?theater_id=`); `POST`, `PATCH`, `DELETE` by id
- `GET /api/upload` – list uploads
- `POST /api/upload/file` – upload Excel/CSV (multipart)
- `POST /api/upload/:id/map` – submit column mapping and persist data
- `GET /api/shows` – list shows (optional `?projectId=`); supports `screen_id`, `ticket_price`, `sold_count` (occupancy)
- `POST /api/shows`, `PATCH /api/shows/:id`, `DELETE /api/shows/:id` – create/update/delete show times
- `GET /api/analytics/dashboard` – dashboard metrics
- `POST /api/reports` – create report
- `GET /api/reports/:id/export?format=pdf|xlsx` – export (auth)
- `GET /api/reports/share/:token` – public read-only report
- `GET /api/users` – list org users (Admin)
- `POST /api/users/invite` – invite user (Admin)

All protected routes expect `Authorization: Bearer <token>` and optionally `X-Organization-Id` for multi-org users.
