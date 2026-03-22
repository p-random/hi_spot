CREATE OR REPLACE FUNCTION find_nearby_users(
  event_lat DOUBLE PRECISION,
  event_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION
) RETURNS TABLE(id UUID, fcm_token TEXT) AS $$
  SELECT u.id, u.fcm_token FROM users u
  WHERE u.fcm_token IS NOT NULL
    AND u.updated_at > now() - interval '5 minutes'
    AND (
      6371 * acos(
        cos(radians(event_lat)) * cos(radians(u.last_lat))
        * cos(radians(u.last_lng) - radians(event_lng))
        + sin(radians(event_lat)) * sin(radians(u.last_lat))
      )
    ) <= radius_km;
$$ LANGUAGE sql;
