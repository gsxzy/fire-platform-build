-- ═══════════════════════════════════════════════════════════════════
-- 设备管理优化 — 数据库索引补充（2026-05-15）
-- 配合前端菜单精简：设备管理仅保留「入库管理」入口
-- ═══════════════════════════════════════════════════════════════════

USE fire_platform;

-- 1. 复合索引：入库管理列表高频查询（按 lifecycle_status 筛选 + created_at 排序）
ALTER TABLE fire_device
  ADD INDEX idx_lifecycle_created (lifecycle_status, created_at);

-- 2. 复合索引：设备编号/名称/SN 联合搜索（DeviceController.list 中的 keyword 搜索）
-- 注意：MySQL 5.6+ 对多列 like 无法完全使用索引，但单列等值+排序可覆盖
ALTER TABLE fire_device
  ADD INDEX idx_device_search (device_no, device_name, device_sn);

-- 3. 若之前已存在同名索引，先删除再重建（幂等）
-- DROP INDEX idx_lifecycle_created ON fire_device;
-- DROP INDEX idx_device_search ON fire_device;

-- 4. 检查现有索引状态（执行后验证）
-- SHOW INDEX FROM fire_device;
