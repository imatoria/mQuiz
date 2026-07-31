-- Cloudflare D1 / SQLite Database Schema for Knowledge Builder

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  is_approved INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes_parent (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects_parent (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  icon_name TEXT,
  color TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS child_class_assignments (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  class_parent_id TEXT,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_parent_id) REFERENCES classes_parent(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS child_subject_assignments (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  subject_parent_id TEXT,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subject_parent_id) REFERENCES subjects_parent(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  class_parent_id TEXT,
  subject_parent_id TEXT,
  total_pages INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_parent_id) REFERENCES classes_parent(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_parent_id) REFERENCES subjects_parent(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_pages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  class_parent_id TEXT,
  subject_parent_id TEXT,
  document_id TEXT,
  page_number INTEGER,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT, -- JSON Array
  correct_answer TEXT,
  explanation TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  difficulty_level TEXT NOT NULL DEFAULT 'medium',
  tags TEXT, -- JSON Array
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_parent_id) REFERENCES classes_parent(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_parent_id) REFERENCES subjects_parent(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS question_papers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  class_parent_id TEXT,
  subject_parent_id TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  difficulty_filter TEXT, -- JSON Array
  assign_to_all INTEGER DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  max_attempts INTEGER DEFAULT 1,
  show_results INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_parent_id) REFERENCES classes_parent(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_parent_id) REFERENCES subjects_parent(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS question_paper_questions (
  id TEXT PRIMARY KEY,
  question_paper_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_assignments (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  assigned_to_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_attempts (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  score REAL DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  progress_percentage REAL DEFAULT 0,
  current_question_index INTEGER DEFAULT 0,
  time_remaining INTEGER DEFAULT 0,
  is_paused INTEGER DEFAULT 0,
  answers TEXT, -- JSON Object
  feedback TEXT,
  show_results INTEGER DEFAULT 1,
  last_activity_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_sessions (
  id TEXT PRIMARY KEY,
  paper_attempt_id TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  last_ping TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paper_attempt_id) REFERENCES paper_attempts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS paper_violations (
  id TEXT PRIMARY KEY,
  paper_attempt_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  occurred_at TEXT DEFAULT (datetime('now')),
  details TEXT, -- JSON Object
  auto_resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paper_attempt_id) REFERENCES paper_attempts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcement_recipients (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_data TEXT NOT NULL, -- JSON Object
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  scheduled_for TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parent_child_relationships (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT, -- JSON Object
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
