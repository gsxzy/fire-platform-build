-- ═══════════════════════════════════════════════════════════════════
-- 设备档案 ↔ IoT 接入 生命周期优化脚本 V2
-- 核心流程：设备档案入库 → 设备接入平台 → 设备分配到单位 → 设备业务配置/维护
-- 执行前请备份。生产环境建议手工审核后执行。
-- ═══════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 一、fire_device 设备档案表优化
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 若 lifecycle_status 不存在则添加；若已存在则修改注释
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND COLUMN_NAME = 'lifecycle_status'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_device
    ADD COLUMN lifecycle_status TINYINT NOT NULL DEFAULT 1
    COMMENT "流程状态：0草稿/预登记 1已入库 2已接入 3已分配 4维护中 5报废"
    AFTER status;',
  'ALTER TABLE fire_device
    MODIFY COLUMN lifecycle_status TINYINT NOT NULL DEFAULT 1
    COMMENT "流程状态：0草稿/预登记 1已入库 2已接入 3已分配 4维护中 5报废";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 档案表增加项目/点位关联字段（若不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND COLUMN_NAME = 'project_code'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_device ADD COLUMN project_code VARCHAR(64) NULL COMMENT "项目/工程编码（分配阶段可选）" AFTER install_location;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND COLUMN_NAME = 'building_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_device ADD COLUMN building_id INT UNSIGNED NULL COMMENT "所属建筑ID" AFTER project_code;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND COLUMN_NAME = 'floor_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_device ADD COLUMN floor_id INT UNSIGNED NULL COMMENT "所属楼层ID" AFTER building_id;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND COLUMN_NAME = 'point_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_device ADD COLUMN point_id INT UNSIGNED NULL COMMENT "平面图点位ID" AFTER floor_id;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 生命周期状态索引
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND INDEX_NAME = 'idx_fire_device_lifecycle'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE fire_device ADD INDEX idx_fire_device_lifecycle (lifecycle_status);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) 组合查询索引：单位+状态（分配页常用）
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND INDEX_NAME = 'idx_fire_device_unit_lifecycle'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE fire_device ADD INDEX idx_fire_device_unit_lifecycle (unit_id, lifecycle_status);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) 设备SN唯一性保障（全平台唯一源头）
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_device'
    AND INDEX_NAME = 'idx_fire_device_sn'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE fire_device ADD INDEX idx_fire_device_sn (device_sn);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 二、fire_iot_device IoT接入设备表优化
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 若 archive_device_id 不存在则添加
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_iot_device'
    AND COLUMN_NAME = 'archive_device_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE fire_iot_device
    ADD COLUMN archive_device_id BIGINT UNSIGNED NULL
    COMMENT "关联 fire_device.id，唯一"
    AFTER id;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 唯一索引：一台档案设备仅允许一条接入记录
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_iot_device'
    AND INDEX_NAME = 'uk_fire_iot_device_archive'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX uk_fire_iot_device_archive ON fire_iot_device (archive_device_id);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 接入状态索引
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fire_iot_device'
    AND INDEX_NAME = 'idx_fire_iot_status'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE fire_iot_device ADD INDEX idx_fire_iot_status (status);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 三、fire_device_allocation_log 设备分配/改派日志表（新建）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS fire_device_allocation_log (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  device_id       BIGINT UNSIGNED NOT NULL COMMENT '关联 fire_device.id',
  device_no       VARCHAR(50)     NOT NULL COMMENT '设备编号（冗余，便于追溯）',
  device_name     VARCHAR(100)    NOT NULL COMMENT '设备名称（冗余）',
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 四、历史数据对齐与修复
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) 按 SN / 设备编号回填 archive_device_id（仅处理 NULL 记录）
UPDATE fire_iot_device i
INNER JOIN fire_device d
  ON (
    (d.device_sn IS NOT NULL AND d.device_sn <> '' AND i.device_sn = d.device_sn)
    OR (i.device_sn = d.device_no)
  )
SET i.archive_device_id = d.id
WHERE i.archive_device_id IS NULL;

-- 2) 生命周期回填：运行状态 status=4（报废）→ lifecycle_status=5
UPDATE fire_device
SET lifecycle_status = 5
WHERE status = 4 AND (lifecycle_status IS NULL OR lifecycle_status < 5);

-- 3) 已有 IoT 接入记录的档案 → 至少已接入（lifecycle_status >= 2）
UPDATE fire_device d
INNER JOIN fire_iot_device i ON i.archive_device_id = d.id
SET d.lifecycle_status = GREATEST(COALESCE(d.lifecycle_status, 1), 2)
WHERE d.lifecycle_status IS NULL OR d.lifecycle_status < 5;

-- 4) 已绑定单位的已接入设备 → 已分配（lifecycle_status = 3）
UPDATE fire_device
SET lifecycle_status = 3
WHERE unit_id IS NOT NULL
  AND lifecycle_status >= 2
  AND lifecycle_status < 4;

-- 5) 未绑定单位且未接入 → 已入库（lifecycle_status = 1）
UPDATE fire_device
SET lifecycle_status = 1
WHERE lifecycle_status IS NULL
   OR (lifecycle_status = 0 AND device_sn IS NOT NULL AND device_sn <> '');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 五、状态枚举速查（供前后端参考，非执行语句）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
  fire_device.lifecycle_status 状态枚举：
  ┌─────┬────────────┬──────────────────────────────────────────┐
  │ 值  │ 状态名      │ 说明                                      │
  ├─────┼────────────┼──────────────────────────────────────────┤
  │  0  │ 草稿/预登记 │ 初步录入，尚未完成正式入库，不可接入       │
  │  1  │ 已入库      │ 档案登记完成，生成唯一SN，允许接入         │
  │  2  │ 已接入      │ 平台接入完成，允许分配                     │
  │  3  │ 已分配      │ 已绑定单位/项目/点位，允许业务配置         │
  │  4  │ 维护中      │ 维保/维修中，暂停正常使用                  │
  │  5  │ 报废        │ 已报废，禁止任何操作                       │
  └─────┴────────────┴──────────────────────────────────────────┘

  状态流转约束：
    0 → 1（入库登记完成）
    1 → 2（设备接入平台）
    2 → 3（设备分配到单位）
    3 → 4（进入维护）
    3 → 5（报废）
    4 → 3（维护完成）
    任意 → 5（报废，终态）

  操作权限：
    • 设备接入：仅允许 lifecycle_status = 1（已入库）的设备
    • 设备分配：仅允许 lifecycle_status = 2（已接入）的设备
    • 设备配置：仅允许 lifecycle_status >= 2 的设备（已接入/已分配/维护中）
    • 档案删除：仅允许 lifecycle_status <= 1 的设备（草稿/已入库）

  fire_device.status 运行状态（独立维度）：
    1=正常  2=故障  3=离线  4=报废  0=停用

  fire_iot_device.status 在线状态：
    0=离线  1=在线  2=故障
*/
