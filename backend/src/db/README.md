# Database (auth-only)

Schema contains only what login and signup need:

- **organizations** – Tenants
- **roles** – Admin, Analyst, Viewer
- **users** – Email, password hash, full name
- **user_organizations** – User ↔ org ↔ role

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env`.
2. Run migrations: `npm run db:migrate`
3. (Optional) Seed demo user: `npm run db:seed`  
   Then log in with **admin@demo.com** / **password123**

## Clean database

To start with an empty database, drop and recreate the schema, then run migrate again:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO your_db_user;
```

Then: `npm run db:migrate` and optionally `npm run db:seed`.
