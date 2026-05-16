-- ============================================================
-- Flyway Migration V051
-- JSON 列生成列与索引优化
-- 源文件: app/sql/json_indexes.sql
-- ============================================================

SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'linkage_rules' AND column_name = 'trigger_alarm_type');
SET @sql := IF(@exists = 0, 'ALTER TABLE linkage_rules ADD COLUMN trigger_alarm_type VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(trigger_condition, \'$.alarmType\'))) STORED', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'linkage_rules' AND index_name = 'idx_trigger_alarm_type');
SET @idx_sql := IF(@idx_exists = 0, 'ALTER TABLE linkage_rules ADD INDEX idx_trigger_alarm_type (trigger_alarm_type)', 'SELECT 1');
PREPARE idx_stmt FROM @idx_sql; EXECUTE idx_stmt; DEALLOCATE PREPARE idx_stmt;
