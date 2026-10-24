CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('订阅源', '存储', '任务', '配置')),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  address TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX resources_updated ON resources(updated_at DESC);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_created ON audit_events(created_at DESC);
INSERT INTO resources VALUES
 ('demo-source', '主订阅源', '订阅源', 'enabled', 'https://example.com/subscription', '示例配置，可编辑或删除。不会连接到已有 Worker。', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('demo-backup', '备用订阅源', '订阅源', 'disabled', 'https://example.com/backup', '备用地址，默认停用。', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('demo-storage', '资料存储', '存储', 'enabled', '', '上传文件可在文件管理中查看。', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 ('demo-task', '每日同步', '任务', 'disabled', '', '这是任务配置记录，本示例没有任务执行器。', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
