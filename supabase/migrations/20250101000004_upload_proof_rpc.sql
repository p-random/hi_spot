-- RPC: upload_proof
-- Atomically marks participation COMPLETED, records EARN point_log, and increments user total_points.
-- Raises exceptions:
--   'NOT_FOUND'         → 404
--   'WRONG_STATUS'      → 400
CREATE OR REPLACE FUNCTION upload_proof(
  p_participation_id UUID,
  p_proof_img_url    TEXT
)
RETURNS TABLE(points_earned INT, total_points INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_part   participations%ROWTYPE;
  v_event  events%ROWTYPE;
  v_total  INT;
BEGIN
  SELECT * INTO v_part FROM participations WHERE id = p_participation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_part.status <> 'WAITING_PROOF' THEN
    RAISE EXCEPTION 'WRONG_STATUS';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = v_part.event_id;

  UPDATE participations
  SET status = 'COMPLETED', proof_img_url = p_proof_img_url
  WHERE id = p_participation_id;

  INSERT INTO point_logs (user_id, amount, type, status, ref_participation_id)
  VALUES (v_part.user_id, v_event.reward_points, 'EARN', 'PENDING', p_participation_id);

  UPDATE users
  SET total_points = total_points + v_event.reward_points
  WHERE id = v_part.user_id
  RETURNING total_points INTO v_total;

  RETURN QUERY SELECT v_event.reward_points, v_total;
END;
$$;
