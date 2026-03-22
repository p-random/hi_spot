-- RPC: join_event
-- Handles first-come-first-served participation with SELECT FOR UPDATE concurrency control.
-- Returns: participation_id, current_slots, max_slots
-- Raises exceptions for caller to map to HTTP status codes:
--   'NOT_ACTIVE'       → 400
--   'OUTSIDE_GEOFENCE' → 403
--   'DUPLICATE'        → 409
--   'FULL'             → 409
CREATE OR REPLACE FUNCTION join_event(
  p_user_id  UUID,
  p_event_id UUID,
  p_lat      DOUBLE PRECISION,
  p_lng      DOUBLE PRECISION
)
RETURNS TABLE(participation_id UUID, current_slots INT, max_slots INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_event        events%ROWTYPE;
  v_distance_m   DOUBLE PRECISION;
  v_participation_id UUID;
  v_new_slots    INT;
BEGIN
  -- Lock the event row for the duration of the transaction
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ACTIVE';
  END IF;

  IF v_event.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'NOT_ACTIVE';
  END IF;

  -- Geofence check
  v_distance_m := haversine_distance_m(p_lat, p_lng, v_event.lat, v_event.lng);
  IF v_distance_m > v_event.join_radius_m THEN
    RAISE EXCEPTION 'OUTSIDE_GEOFENCE';
  END IF;

  -- Duplicate participation check
  IF EXISTS (
    SELECT 1 FROM participations
    WHERE user_id = p_user_id AND event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE';
  END IF;

  -- Slot availability check (row already locked above)
  IF v_event.current_slots >= v_event.max_slots THEN
    RAISE EXCEPTION 'FULL';
  END IF;

  v_new_slots := v_event.current_slots + 1;

  -- Increment slot count; close event if last slot taken
  UPDATE events
  SET
    current_slots = v_new_slots,
    status = CASE WHEN v_new_slots = v_event.max_slots THEN 'CLOSED' ELSE status END
  WHERE id = p_event_id;

  -- Record participation
  INSERT INTO participations (user_id, event_id, status)
  VALUES (p_user_id, p_event_id, 'WAITING_PROOF')
  RETURNING id INTO v_participation_id;

  RETURN QUERY SELECT v_participation_id, v_new_slots, v_event.max_slots;
END;
$$;
