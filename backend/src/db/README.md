# Database

Seed data is India-focused: organizations (ScreenIQ India, Metro Cinemas India), regions (North India/NCR, East Punjab, Maharashtra, Karnataka, Tamil Nadu, West Bengal), cinema chains (PVR Cinemas, Cinepolis India, INOX), and theatres in Delhi, Mumbai, Bengaluru, Pune, Chandigarh, Kolkata.

## Schema overview

- **organizations** – Tenants; every tenant-scoped table has `organization_id`.
- **users** – Global; linked to orgs via **user_organizations** with a **roles** (Admin, Analyst, Viewer).
- **projects** – Movies/events; belong to an org; have name, release_date, language, regions.
- **uploaded_files** – Excel/CSV upload metadata; optional project_id; status, column_mapping.
- **data_records** – Flexible JSONB payload per row from uploads; org + optional project + optional uploaded_file_id.
- **shows** – Screenings; project_id, name, screen_name, region, start_time, end_time, capacity.
- **allocations** – Optional link of data_records or values to shows.
- **reports** – Title, type, share_token for read-only links; created_by.

All tenant tables use soft delete (`deleted_at`) where noted. Indexes on `organization_id`, foreign keys, and GIN on `data_records.payload` for performance.

## Migrations

Run once (or to apply schema changes):

```bash
npm run db:migrate
```

This executes `schema.sql` (CREATE TABLE IF NOT EXISTS, INSERT roles, triggers). Safe to re-run.
