-- ═══════════════════════════════════════════════════════════════════
-- Flyway Migration V048
-- 数据清理：删除纯演示/测试孤儿 IoT 记录
-- 来源：backend/sql/cleanup_device_orphan_20260515.sql 拆分
-- 依赖：V006（fire_iot_device 表已创建）
-- 幂等性：DELETE WHERE 条件精确匹配
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM fire_iot_device
WHERE (archive_device_id IS NULL OR archive_device_id = 0)
  AND (device_sn IS NULL OR device_sn = '')
  AND (protocol_type IS NULL OR protocol_type = '');
