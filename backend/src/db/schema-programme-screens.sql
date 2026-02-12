-- Optional: which screen(s) at a theatre run a given programme.
-- If no rows exist for a (programme_id, theatre_id), the programme runs at the theatre (all screens / unallocated).
-- Run after schema-screens (theatre_screens table exists).

CREATE TABLE IF NOT EXISTS programme_theatre_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  theatre_id UUID NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES theatre_screens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(programme_id, theatre_id, screen_id)
);

CREATE INDEX IF NOT EXISTS idx_programme_theatre_screens_lookup ON programme_theatre_screens(theatre_id, screen_id);
