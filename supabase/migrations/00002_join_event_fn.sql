CREATE OR REPLACE FUNCTION join_event_tx(
  p_user_id UUID,
  p_event_id UUID
) RETURNS TABLE(participation_id UUID, current_slots INT, max_slots INT) AS $$
DECLARE
  v_cur INT;
  v_max INT;
  v_new INT;
  v_pid UUID;
BEGIN
  -- Lock the event row
  SELECT e.current_slots, e.max_slots INTO v_cur, v_max
  FROM events e WHERE e.id = p_event_id FOR UPDATE;

  IF v_cur >= v_max THEN
    RAISE EXCEPTION 'SLOTS_FULL';
  END IF;

  v_new := v_cur + 1;

  -- Increment slots, auto-close if full
  IF v_new = v_max THEN
    UPDATE events SET current_slots = v_new, status = 'CLOSED' WHERE id = p_event_id;
  ELSE
    UPDATE events SET current_slots = v_new WHERE id = p_event_id;
  END IF;

  -- Insert participation
  INSERT INTO participations (user_id, event_id, status)
  VALUES (p_user_id, p_event_id, 'WAITING_PROOF')
  RETURNING id INTO v_pid;

  RETURN QUERY SELECT v_pid, v_new, v_max;
END;
$$ LANGUAGE plpgsql;
