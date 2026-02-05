-- ScreenIQ Multi-Tenant SaaS Schema
-- Run via migration or psql. Tenant isolation via organization_id on all tenant-scoped tables.

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles: Admin, Analyst, Viewer (stored once; referenced by user_roles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES ('Admin'), ('Analyst'), ('Viewer') ON CONFLICT (name) DO NOTHING;

-- Users: global table; org membership via user_organizations
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- User-Organization-Role: which org a user belongs to and their role there
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations(organization_id);

-- Projects (movies/events) - tenant-scoped
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  release_date DATE,
  language VARCHAR(50),
  regions TEXT[], -- e.g. ['US', 'UK']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;

-- Uploaded files (Excel/CSV) - tenant-scoped, optional project link
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  row_count INT,
  column_mapping JSONB, -- { "sheetCol": "fieldName", ... }
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_org ON uploaded_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_project ON uploaded_files(project_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_deleted ON uploaded_files(deleted_at) WHERE deleted_at IS NULL;

-- Data records: flexible rows from uploaded data (e.g. show/screen rows)
CREATE TABLE IF NOT EXISTS data_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  payload JSONB NOT NULL, -- { field1: value1, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_records_org ON data_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_records_project ON data_records(project_id);
CREATE INDEX IF NOT EXISTS idx_data_records_file ON data_records(uploaded_file_id);
CREATE INDEX IF NOT EXISTS idx_data_records_deleted ON data_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_records_payload_gin ON data_records USING GIN(payload);

-- Shows (screenings) - tenant & project scoped
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  screen_name VARCHAR(255),
  region VARCHAR(100),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shows_org ON shows(organization_id);
CREATE INDEX IF NOT EXISTS idx_shows_project ON shows(project_id);
CREATE INDEX IF NOT EXISTS idx_shows_times ON shows(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_shows_deleted ON shows(deleted_at) WHERE deleted_at IS NULL;

-- Allocations (optional: link data_records or external id to shows)
CREATE TABLE IF NOT EXISTS allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  data_record_id UUID REFERENCES data_records(id) ON DELETE SET NULL,
  allocated_value DECIMAL(20,4), -- e.g. seats, revenue
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_allocations_show ON allocations(show_id);
CREATE INDEX IF NOT EXISTS idx_allocations_org ON allocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_allocations_deleted ON allocations(deleted_at) WHERE deleted_at IS NULL;

-- Reports - generated summaries, shareable links
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- summary, allocation, etc.
  share_token VARCHAR(64) UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_deleted ON reports(deleted_at) WHERE deleted_at IS NULL;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (idempotent: drop then create)
DROP TRIGGER IF EXISTS set_updated_at ON organizations;
DROP TRIGGER IF EXISTS set_updated_at ON users;
DROP TRIGGER IF EXISTS set_updated_at ON projects;
DROP TRIGGER IF EXISTS set_updated_at ON uploaded_files;
DROP TRIGGER IF EXISTS set_updated_at ON data_records;
DROP TRIGGER IF EXISTS set_updated_at ON shows;
DROP TRIGGER IF EXISTS set_updated_at ON allocations;
DROP TRIGGER IF EXISTS set_updated_at ON reports;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON uploaded_files FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON data_records FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON allocations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ========== Cinema / theater / screen management (org-scoped) ==========
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_regions_org ON regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_regions_deleted ON regions(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cinema_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cinema_chains_org ON cinema_chains(organization_id);
CREATE INDEX IF NOT EXISTS idx_cinema_chains_deleted ON cinema_chains(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS theaters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cinema_chain_id UUID REFERENCES cinema_chains(id) ON DELETE SET NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_theaters_org ON theaters(organization_id);
CREATE INDEX IF NOT EXISTS idx_theaters_chain ON theaters(cinema_chain_id);
CREATE INDEX IF NOT EXISTS idx_theaters_region ON theaters(region_id);
CREATE INDEX IF NOT EXISTS idx_theaters_deleted ON theaters(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  theater_id UUID NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  capacity INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_screens_org ON screens(organization_id);
CREATE INDEX IF NOT EXISTS idx_screens_theater ON screens(theater_id);
CREATE INDEX IF NOT EXISTS idx_screens_deleted ON screens(deleted_at) WHERE deleted_at IS NULL;

-- Extend shows with screen, ticket price, occupancy (sold_count)
DO $$ BEGIN
  ALTER TABLE shows ADD COLUMN screen_id UUID REFERENCES screens(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE shows ADD COLUMN ticket_price DECIMAL(10,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE shows ADD COLUMN sold_count INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_shows_screen ON shows(screen_id) WHERE screen_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at ON regions;
DROP TRIGGER IF EXISTS set_updated_at ON cinema_chains;
DROP TRIGGER IF EXISTS set_updated_at ON theaters;
DROP TRIGGER IF EXISTS set_updated_at ON screens;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cinema_chains FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON theaters FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON screens FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ========== Movie Programming: slate (title) fields + influencing factors ==========
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
