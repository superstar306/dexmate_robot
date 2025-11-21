-- Create enum types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE permission_type AS ENUM ('USAGE', 'ADMIN');
CREATE TYPE group_role AS ENUM ('ADMIN', 'MEMBER');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(150) UNIQUE NOT NULL,
  name VARCHAR(120),
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'USER',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  date_joined TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS user_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS user_role_idx ON users(role);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS group_name_idx ON groups(name);

-- Group memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_membership_idx ON group_memberships(group_id, user_id);

-- Robots table
CREATE TABLE IF NOT EXISTS robots (
  serial_number VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  model VARCHAR(120),
  owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  owner_group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT robot_owner_xor CHECK (
    (owner_user_id IS NOT NULL AND owner_group_id IS NULL) OR
    (owner_user_id IS NULL AND owner_group_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS robot_sn_idx ON robots(serial_number);
CREATE INDEX IF NOT EXISTS robot_owner_user_idx ON robots(owner_user_id);
CREATE INDEX IF NOT EXISTS robot_owner_group_idx ON robots(owner_group_id);

-- Robot permissions table
CREATE TABLE IF NOT EXISTS robot_permissions (
  id SERIAL PRIMARY KEY,
  robot_serial_number VARCHAR(64) NOT NULL REFERENCES robots(serial_number) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type permission_type NOT NULL,
  granted_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(robot_serial_number, user_id)
);

CREATE INDEX IF NOT EXISTS robot_permission_idx ON robot_permissions(robot_serial_number, user_id);

-- Robot settings table
CREATE TABLE IF NOT EXISTS robot_settings (
  id SERIAL PRIMARY KEY,
  robot_serial_number VARCHAR(64) NOT NULL REFERENCES robots(serial_number) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(robot_serial_number, user_id)
);

CREATE INDEX IF NOT EXISTS robot_setting_idx ON robot_settings(robot_serial_number, user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_robots_updated_at BEFORE UPDATE ON robots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_robot_settings_updated_at BEFORE UPDATE ON robot_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

