-- Programme/scheduling tables (regions, states, locations, theatres, movies, programmes, programme_theatres).
-- Run via: node src/db/migrate-programme.js (or include in main migrate).

-- Regions (optional organization_id for multi-tenant)
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS theatres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  chain VARCHAR(100),
  screen_count INT NOT NULL DEFAULT 1,
  capabilities JSONB NOT NULL DEFAULT '{"2D": true, "3D": false, "IMAX": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Movies (may already exist from main seed with different columns; we add missing ones if needed)
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  release_date DATE,
  language VARCHAR(100),
  duration_mins INT,
  version VARCHAR(50),
  genre VARCHAR(255),
  budget BIGINT,
  sentiment VARCHAR(50),
  buzz VARCHAR(50),
  overview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns to movies if table existed with fewer columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'version') THEN
    ALTER TABLE movies ADD COLUMN version VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'duration_mins') THEN
    ALTER TABLE movies ADD COLUMN duration_mins INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'genre') THEN
    ALTER TABLE movies ADD COLUMN genre VARCHAR(255);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  time_slot_pattern VARCHAR(50) NOT NULL DEFAULT 'linear',
  tat_mins INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programme_theatres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  theatre_id UUID NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  shows_per_theatre INT NOT NULL DEFAULT 1,
  shows_per_screen INT NOT NULL DEFAULT 1,
  capacity_utilization VARCHAR(50) NOT NULL DEFAULT 'moderate',
  version_ratio_2d INT DEFAULT 70,
  version_ratio_3d INT DEFAULT 20,
  version_ratio_imax INT DEFAULT 10,
  languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(programme_id, theatre_id)
);

CREATE INDEX IF NOT EXISTS idx_programmes_dates ON programmes(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_programme_theatres_programme ON programme_theatres(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_theatres_theatre ON programme_theatres(theatre_id);
̦
