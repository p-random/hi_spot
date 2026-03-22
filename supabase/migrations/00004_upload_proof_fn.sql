CREATE OR REPLACE FUNCTION upload_proof_tx(
  p_participation_id UUID,
  p_proof_img_url TEXT
) RETURNS TABLE(user_id UUID, points_earned INT, total_points INT) AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
  v_status participation_status;
  v_reward INT;
  v_total INT;
BEGIN
  -- Look up participation + event reward
  SELECT p.user_id, p.event_id, p.status, e.reward_points
  INTO v_user_id, v_event_id, v_status, v_reward
  FROM participations p
  JOIN events e ON e.id = p.event_id
  WHERE p.id = p_participation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_status != 'WAITING_PROOF' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  -- Update participation
  UPDATE participations
  SET status = 'COMPLETED', proof_img_url = p_proof_img_url
  WHERE id = p_participation_id;

  -- Insert point log
  INSERT INTO point_logs (user_id, amount, type, status, ref_participation_id)
  VALUES (v_user_id, v_reward, 'EARN', 'PENDING', p_participation_id);

  -- Update user total_points
  UPDATE users SET total_points = total_points + v_reward
  WHERE id = v_user_id
  RETURNING users.total_points INTO v_total;

  RETURN QUERY SELECT v_user_id, v_reward, v_total;
END;
$$ LANGUAGE plpgsql;
