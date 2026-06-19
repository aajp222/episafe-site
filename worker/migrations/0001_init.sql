-- EpiSafe CMS — initial schema
-- Apply with: npx wrangler d1 migrations apply episafe-cms

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'employee',   -- 'admin' | 'employee'
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Founder / team cards shown on team.html
CREATE TABLE IF NOT EXISTS team_profiles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- which login owns/edits this card
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT '',     -- e.g. "CEO · Founder"
  bio        TEXT NOT NULL DEFAULT '',
  working_on TEXT NOT NULL DEFAULT '',
  photo_url  TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_team_user ON team_profiles(user_id);

-- News posts shown on news.html
CREATE TABLE IF NOT EXISTS news_posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL DEFAULT '',
  date       TEXT NOT NULL DEFAULT (date('now')),
  excerpt    TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  image_url  TEXT NOT NULL DEFAULT '',
  published  INTEGER NOT NULL DEFAULT 0,
  author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_news_pub ON news_posts(published, date);

-- Open roles ("Coming soon" hiring cards) on team.html
CREATE TABLE IF NOT EXISTS open_roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT '',     -- e.g. "Full-time"
  description TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
