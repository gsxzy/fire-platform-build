-- ============================================================
-- Flyway Migration V049
-- 设备管理索引优化（2026-05-15）
-- 源文件: backend/sql/optimize_device_schema_20260515.sql
-- ============================================================

-- 1. 复合索引：入库管理列表高频查询（按 lifecycle_status 筛选 + created_at 排序）
ALTER TABLE fire_device
  ADD INDEX IF NOT EXISTS idx_lifecycle_created (lifecycle_status, created_at);

-- 2. 复合索引：设备编号/名称/SN 联合搜索
ALTER TABLE fire_device
  ADD INDEX IF NOT EXISTS idx_device_search (device_no, device_name, device_sn);
