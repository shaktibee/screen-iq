-- Movie Programming: add columns to projects and title_factors table.
-- Run with: node src/db/migrate-programming.js (or npm run db:migrate:programming)

DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN duration_mins INT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN genre VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN versions TEXT[];
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN week_start DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN censor_certificate VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- Turn Around Time (minutes)
DO $$ BEGIN ALTER TABLE projects ADD COLUMN entry_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN ent_com_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN ent_trl_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN int_com_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN int_slides_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN int_trl_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN hk_mins INT DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN turnaround_total_mins INT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE projects ADD COLUMN turnaround_in_hrs VARCHAR(10); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS title_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_franchise BOOLEAN DEFAULT false,
  genre_buzz DECIMAL(5,2) DEFAULT 0,
  actor_buzz DECIMAL(5,2) DEFAULT 0,
  lead_actor_performance DECIMAL(5,2) DEFAULT 0,
  language_population_pct DECIMAL(5,2) DEFAULT 0,
  social_buzz DECIMAL(5,2) DEFAULT 0,
  advance_booking_pct DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);
CREATE INDEX IF NOT EXISTS idx_title_factors_org ON title_factors(organization_id);
CREATE INDEX IF NOT EXISTS idx_title_factors_project ON title_factors(project_id);
DROP TRIGGER IF EXISTS set_updated_at ON title_factors;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON title_factors FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
