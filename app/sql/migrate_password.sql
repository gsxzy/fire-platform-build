-- 迁移 users.password 到 users.password_hash
-- 前提：password 列已存储 bcrypt 哈希值（非明文）

UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;
