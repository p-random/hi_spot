-- Enum types
CREATE TYPE event_status AS ENUM ('SCHEDULED', 'ACTIVE', 'CLOSED');
CREATE TYPE participation_status AS ENUM ('WAITING_PROOF', 'COMPLETED', 'REJECTED');
CREATE TYPE point_log_type AS ENUM ('EARN', 'REVOKE');
CREATE TYPE point_log_status AS ENUM ('PENDING', 'FINALIZED', 'REJECTED');

-- Tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  total_points INT DEFAULT 0,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  fcm_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  notify_radius_km DOUBLE PRECISION NOT NULL,
  join_radius_m INT NOT NULL,
  max_slots INT NOT NULL,
  current_slots INT DEFAULT 0,
  reward_points INT NOT NULL,
  status event_status DEFAULT 'ACTIVE',
  scheduled_at TIMESTAMPTZ,
  recruit_duration_min INT DEFAULT 5,
  activated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_id UUID NOT NULL REFERENCES events(id),
  status participation_status DEFAULT 'WAITING_PROOF',
  proof_img_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INT NOT NULL CHECK (amount > 0),
  type point_log_type NOT NULL,
  status point_log_status DEFAULT 'PENDING',
  ref_participation_id UUID REFERENCES participations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_participations_user_event ON participations(user_id, event_id);
CREATE INDEX idx_point_logs_participation ON point_logs(ref_participation_id);
