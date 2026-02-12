-- Screens (audis) per theatre for schedule overview.
-- Run after schema-programme. Then run seed-screens.js to populate.

CREATE TABLE IF NOT EXISTS theatre_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_id UUID NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(theatre_id, name)
);

CREATE INDEX IF NOT EXISTS idx_theatre_screens_theatre ON theatre_screens(theatre_id);
