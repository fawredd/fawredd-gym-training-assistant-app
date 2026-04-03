-- Drizzle migration: create training_objectives and training_states tables
CREATE TABLE IF NOT EXISTS fawredd_gym.training_objectives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES fawredd_gym.users(id),
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS fawredd_gym.training_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES fawredd_gym.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
