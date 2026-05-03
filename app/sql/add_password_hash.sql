-- 为 users 表添加 password_hash 和 salt 列（兼容旧版 MySQL）

SET @exists_hash := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_hash');
SET @sql_hash := IF(@exists_hash = 0, 'ALTER TABLE users ADD COLUMN password_hash VARCHAR(256) DEFAULT NULL COMMENT \'密码哈希值（bcrypt/argon2等）\'', 'SELECT 1');
PREPARE stmt_hash FROM @sql_hash; EXECUTE stmt_hash; DEALLOCATE PREPARE stmt_hash;

SET @exists_salt := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'salt');
SET @sql_salt := IF(@exists_salt = 0, 'ALTER TABLE users ADD COLUMN salt VARCHAR(64) DEFAULT NULL COMMENT \'密码盐值\'', 'SELECT 1');
PREPARE stmt_salt FROM @sql_salt; EXECUTE stmt_salt; DEALLOCATE PREPARE stmt_salt;

-- 迁移 password 到 password_hash
UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;
