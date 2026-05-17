-- ============================================================
-- Flyway Migration V059
-- ISNB 协议解析器集成标记（表结构已在 V046/V047 创建）
-- 源文件: backend/sql/deploy_isnb_20260515.sql
-- ============================================================

-- ctwing_raw_log 和 iot_telemetry 表已在 V046/V047 创建
-- 此处保留版本号以维持历史连续性
SELECT 'ISNB tables already created in V046/V047' AS status;
