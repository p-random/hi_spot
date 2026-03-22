-- RPC: verify_point
-- APPROVE: sets EARN point_log to FINALIZED.
-- REJECT:  sets EARN point_log to REJECTED, inserts REVOKE log, subtracts points, sets participation REJECTED.
-- Raises exceptions:
--   'NOT_FOUND'         → 404  (participation missing)
--   'NO_POINT_LOG'      → 400  (no EARN log for participation)
--   'ALREADY_PROCESSED' → 409  (log already FINALIZED or REJECTED)
CREATE OR REPLACE FUNCTION verify_point(
  p_participation_id UUID,
  p_action           TEXT   -- 'APPROVE' or 'REJECT'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_part  participations%ROWTYPE;
  v_log   point_logs%ROWTYPE;
BEGIN
  SELECT * INTO v_part FROM participations WHERE id = p_participation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO v_log
  FROM point_logs
  WHERE ref_participation_id = p_participation_id AND type = 'EARN'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_POINT_LOG';
  END IF;

  IF v_log.status IN ('FINALIZED', 'REJECTED') THEN
    RAISE EXCEPTION 'ALREADY_PROCESSED';
  END IF;

  IF p_action = 'APPROVE' THEN
    UPDATE point_logs SET status = 'FINALIZED' WHERE id = v_log.id;

  ELSIF p_action = 'REJECT' THEN
    UPDATE point_logs SET status = 'REJECTED' WHERE id = v_log.id;

    INSERT INTO point_logs (user_id, amount, type, status, ref_participation_id)
    VALUES (v_part.user_id, v_log.amount, 'REVOKE', 'FINALIZED', p_participation_id);

    UPDATE users
    SET total_points = total_points - v_log.amount
    WHERE id = v_part.user_id;

    UPDATE participations SET status = 'REJECTED' WHERE id = p_participation_id;
  END IF;
END;
$$;
