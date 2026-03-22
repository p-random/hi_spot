CREATE OR REPLACE FUNCTION reject_point_tx(
  p_participation_id UUID,
  p_point_log_id UUID,
  p_user_id UUID,
  p_amount INT
) RETURNS VOID AS $$
BEGIN
  UPDATE point_logs SET status = 'REJECTED' WHERE id = p_point_log_id;

  INSERT INTO point_logs (user_id, amount, type, status, ref_participation_id)
  VALUES (p_user_id, p_amount, 'REVOKE', 'FINALIZED', p_participation_id);

  UPDATE users SET total_points = total_points - p_amount WHERE id = p_user_id;

  UPDATE participations SET status = 'REJECTED' WHERE id = p_participation_id;
END;
$$ LANGUAGE plpgsql;
