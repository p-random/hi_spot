-- RPC: lazy_close_events
-- Closes ACTIVE events whose recruit window has expired (Lazy Close pattern)
CREATE OR REPLACE FUNCTION lazy_close_events()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE events
  SET status = 'CLOSED'
  WHERE status = 'ACTIVE'
    AND activated_at + (recruit_duration_min || ' minutes')::interval <= now();
$$;

-- RPC: haversine_distance_m
-- Returns distance in meters between two coordinates using Haversine formula
CREATE OR REPLACE FUNCTION haversine_distance_m(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371000 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(lat1)) * cos(radians(lat2))
      * cos(radians(lng2) - radians(lng1))
      + sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;
