-- RPC: get_nearby_users
-- Returns users with fcm_token within notify_radius_km using Haversine, active in last 5 minutes
CREATE OR REPLACE FUNCTION get_nearby_users(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (id UUID, fcm_token TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT id, fcm_token
  FROM users
  WHERE fcm_token IS NOT NULL
    AND updated_at > now() - interval '5 minutes'
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(last_lat))
          * cos(radians(last_lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(last_lat))
        ))
      )
    ) <= p_radius_km;
$$;
