-- ═══════════════════════════════════════════════════════════════════════════
-- 智慧消防：设备档案 / 接入 / 配置 / 维护 数据一致性校验与清理参考
-- 表名以当前 Sequelize 模型为准：fire_device、fire_iot_device、fire_device_maintenance
-- 执行前请备份；UPDATE/DELETE 请按业务审核后取消注释执行
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) 接入孤儿：fire_iot_device 无关联档案 或 关联 ID 在档案中不存在 ─────────
SELECT 'iot_no_archive_or_bad_fk' AS issue, i.id, i.device_sn, i.device_name, i.protocol_type, i.archive_device_id
FROM fire_iot_device i
LEFT JOIN fire_device d ON d.id = i.archive_device_id
WHERE i.archive_device_id IS NULL
   OR d.id IS NULL;

-- 修复思路 A：若能在 fire_device 中按 device_sn / device_no 匹配到唯一档案，则回填 archive_device_id
-- UPDATE fire_iot_device i
-- INNER JOIN fire_device d ON TRIM(d.device_sn) = TRIM(i.device_sn) AND TRIM(i.device_sn) <> ''
-- SET i.archive_device_id = d.id
-- WHERE i.archive_device_id IS NULL;

-- 修复思路 B：确认无档案且不再使用的 CTWing 孤儿，删除接入行（会丢失未同步的配置，慎用）
-- DELETE FROM fire_iot_device WHERE archive_device_id IS NULL AND protocol_type = 'CTWing';

-- ── 2) 档案侧「有接入指针」但接入表无行（少见，一般由代码不一致产生）──────
SELECT 'archive_missing_iot' AS issue, d.id, d.device_no, d.device_sn, d.lifecycle_status
FROM fire_device d
LEFT JOIN fire_iot_device i ON i.archive_device_id = d.id
WHERE d.lifecycle_status >= 2
  AND i.id IS NULL;

-- 处理：在「设备接入」补建接入记录，或将 lifecycle_status 回退（需业务确认）

-- ── 3) 维护记录指向已删除设备（若 device_id 无外键时）────────────────────
SELECT 'maint_orphan_device' AS issue, m.id, m.device_id, m.device_code, m.device_name
FROM fire_device_maintenance m
LEFT JOIN fire_device d ON d.id = m.device_id
WHERE d.id IS NULL;

-- 清理：归档或删除孤立维护行（示例）
-- DELETE FROM fire_device_maintenance WHERE device_id NOT IN (SELECT id FROM fire_device);

-- ── 4) CTWing 原始日志中的设备是否已有档案（辅助排查，表可能不存在）──────
-- SELECT l.device_id, COUNT(*) AS cnt
-- FROM ctwing_raw_log l
-- LEFT JOIN fire_device d ON TRIM(d.device_sn) = TRIM(l.device_id) OR TRIM(d.device_no) = TRIM(l.device_id)
-- WHERE d.id IS NULL
-- GROUP BY l.device_id;
