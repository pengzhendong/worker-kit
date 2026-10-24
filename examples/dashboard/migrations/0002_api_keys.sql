CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT
);
CREATE INDEX api_keys_owner_created ON api_keys(owner, created_at DESC);
