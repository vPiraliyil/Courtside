CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) UNIQUE NOT NULL,
  sport VARCHAR(50) DEFAULT 'basketball',
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  winner VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(12) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  game_id UUID REFERENCES games(id),
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  stake DECIMAL(10,2) NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  pick_type VARCHAR(50) NOT NULL DEFAULT 'winner',
  pick_value VARCHAR(100) NOT NULL,
  target VARCHAR(100),
  is_correct BOOLEAN,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, game_id, pick_type)
);

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
