-- Fix sys_permission schema mismatch between MySQL and PostgreSQL
ALTER TABLE sys_permission ALTER COLUMN type TYPE VARCHAR(50);
ALTER TABLE sys_permission ADD COLUMN IF NOT EXISTS perm_type VARCHAR(32);
ALTER TABLE sys_permission ADD COLUMN IF NOT EXISTS component VARCHAR(256);
ALTER TABLE sys_permission ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
