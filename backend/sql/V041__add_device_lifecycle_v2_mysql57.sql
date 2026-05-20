-- ============================================================
-- Flyway Migration V041 (MySQL 5.7 Compatible)
-- 设备生命周期优化 V2 — 扩展字段与索引
-- 源文件: backend/sql/device_lifecycle_v2.sql
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddColumn$$
CREATE PROCEDURE SafeAddColumn(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_col, ' ', p_def);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS SafeAddIndex$$
CREATE PROCEDURE SafeAddIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- 一、fire_device 设备档案表优化
CALL SafeAddColumn('fire_device', 'building_id', 'INT UNSIGNED NULL COMMENT "所属建筑ID" AFTER project_code');
CALL SafeAddColumn('fire_device', 'floor_id', 'INT UNSIGNED NULL COMMENT "所属楼层ID" AFTER building_id');
CALL SafeAddColumn('fire_device', 'point_id', 'INT UNSIGNED NULL COMMENT "平面图点位ID" AFTER floor_id');

CALL SafeAddIndex('fire_device', 'idx_fire_device_unit_lifecycle', 'unit_id, lifecycle_status');
CALL SafeAddIndex('fire_device', 'idx_fire_device_sn', 'device_sn');

-- 二、fire_iot_device 接入状态索引
CALL SafeAddIndex('fire_iot_device', 'idx_fire_iot_status', 'status');

-- 三、创建设备分配/改派日志表
CREATE TABLE IF NOT EXISTS fire_device_allocation_log (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  device_id       BIGINT UNSIGNED NOT NULL COMMENT '关联 fire_device.id',
  device_no       VARCHAR(50)     NOT NULL COMMENT '设备编号',
  device_name     VARCHAR(100)    NOT NULL COMMENT '设备名称',
  operation_type  TINYINT         NOT NULL COMMENT '操作类型：1分配 2改派 3解绑',
  prev_unit_id    BIGINT UNSIGNED NULL COMMENT '原单位ID',
  prev_unit_name  VARCHAR(200)    NULL COMMENT '原单位名称',
  new_unit_id     BIGINT UNSIGNED NULL COMMENT '新单位ID',
  new_unit_name   VARCHAR(200)    NULL COMMENT '新单位名称',
  project_code    VARCHAR(64)     NULL COMMENT '关联项目编码',
  building_id     INT UNSIGNED    NULL COMMENT '关联建筑ID',
  floor_id        INT UNSIGNED    NULL COMMENT '关联楼层ID',
  point_id        INT UNSIGNED    NULL COMMENT '关联点位ID',
  operator_id     BIGINT UNSIGNED NULL COMMENT '操作人ID',
  operator_name   VARCHAR(50)     NULL COMMENT '操作人姓名',
  remark          VARCHAR(500)    NULL COMMENT '操作备注',
  created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  INDEX idx_alloc_log_device (device_id),
  INDEX idx_alloc_log_time (created_at),
  INDEX idx_alloc_log_operation (operation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备分配/改派/解绑操作日志';

DROP PROCEDURE IF EXISTS SafeAddColumn;
DROP PROCEDURE IF EXISTS SafeAddIndex;
