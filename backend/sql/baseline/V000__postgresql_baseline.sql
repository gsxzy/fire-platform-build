-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL 业务主库基线脚本
-- 新致远智慧消防平台 — 三库架构（PostgreSQL + Redis + TDengine）
-- ═══════════════════════════════════════════════════════════════
--
-- 【适用场景】
-- 1. 全新环境首次初始化（Docker 或手动部署）
-- 2. 从 MySQL 迁移后的 PostgreSQL schema 基线
--
-- 【执行方式】
--   # Docker 首次启动时会通过 initdb.d 自动执行
--   # 手动执行：
--   psql -U postgres -c "CREATE DATABASE fire_platform WITH ENCODING = 'UTF8' LC_COLLATE = 'zh_CN.UTF-8';"
--   psql -U fire_user -d fire_platform -f V000__postgresql_baseline.sql
--
-- 【架构说明】
-- ┌─────────────────┬────────────────────────────────────────────┐
-- │ 数据库          │ 用途                                       │
-- ├─────────────────┼────────────────────────────────────────────┤
-- │ PostgreSQL      │ 业务主库（56+ 张表，单位/设备/告警/用户等）│
-- │ Redis           │ 缓存/会话/设备在线状态/限流                │
-- │ TDengine        │ 时序数据（传感器遥测/原始报文日志）        │
-- └─────────────────┴────────────────────────────────────────────┘
--
-- 【表分类】
-- A. 原生 SQL 管理表（无 Sequelize 模型）：本脚本显式创建
-- B. Sequelize 模型表（fire_*, sys_* 等）：首次启动时由 sequelize.sync() 自动创建
-- C. 原生 + 模型混合表：本脚本创建基础结构，模型负责字段校验
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 0. 扩展安装
-- ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ───────────────────────────────────────────────────────────────
-- 1. 原生 SQL 管理表：GB26875 传输装置
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gb26875_device (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL,
  device_name VARCHAR(128) DEFAULT NULL,
  ip VARCHAR(32) DEFAULT NULL,
  port INT DEFAULT 5200,
  building_id VARCHAR(32) DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  last_heartbeat TIMESTAMP DEFAULT NULL,
  login_time TIMESTAMP DEFAULT NULL,
  version VARCHAR(32) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_gb_device_id UNIQUE(device_id)
);
CREATE INDEX IF NOT EXISTS idx_gb_device_status ON gb26875_device(status);

CREATE TABLE IF NOT EXISTS gb26875_alarm (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL,
  host_code VARCHAR(32) DEFAULT NULL,
  loop_no INT DEFAULT NULL,
  address INT DEFAULT NULL,
  device_type VARCHAR(64) DEFAULT NULL,
  alarm_type VARCHAR(64) DEFAULT NULL,
  alarm_level SMALLINT DEFAULT 1,
  location VARCHAR(128) DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recover_time TIMESTAMP DEFAULT NULL,
  raw_data TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_gb_alm_device ON gb26875_alarm(device_id);
CREATE INDEX IF NOT EXISTS idx_gb_alm_time ON gb26875_alarm(alarm_time);
CREATE INDEX IF NOT EXISTS idx_gb_alm_status ON gb26875_alarm(status);

-- ───────────────────────────────────────────────────────────────
-- 2. 原生 SQL 管理表：FSCN8001 赋安协议
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fscn8001_device (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_sn VARCHAR(32) NOT NULL,
  device_name VARCHAR(128) DEFAULT NULL,
  ip VARCHAR(32) DEFAULT NULL,
  port INT DEFAULT 5201,
  status SMALLINT DEFAULT 1,
  last_heartbeat TIMESTAMP DEFAULT NULL,
  login_time TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_fscn_sn UNIQUE(device_sn)
);
CREATE INDEX IF NOT EXISTS idx_fscn_device_status ON fscn8001_device(status);

CREATE TABLE IF NOT EXISTS fscn8001_alarm (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_sn VARCHAR(32) NOT NULL,
  alarm_type VARCHAR(32) DEFAULT NULL,
  alarm_level VARCHAR(16) DEFAULT NULL,
  location VARCHAR(256) DEFAULT NULL,
  loop_no INT DEFAULT NULL,
  address INT DEFAULT NULL,
  host_code VARCHAR(32) DEFAULT NULL,
  device_type VARCHAR(32) DEFAULT NULL,
  status SMALLINT DEFAULT 0,
  alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT
);
CREATE INDEX IF NOT EXISTS idx_fscn_alm_sn ON fscn8001_alarm(device_sn);
CREATE INDEX IF NOT EXISTS idx_fscn_alm_time ON fscn8001_alarm(alarm_time);

-- ───────────────────────────────────────────────────────────────
-- 3. 设备心跳表
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fire_device_heartbeat (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id BIGINT NOT NULL,
  device_no VARCHAR(50) NOT NULL,
  protocol_type VARCHAR(20) NOT NULL,
  last_heartbeat_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  offline_count INT NOT NULL DEFAULT 0,
  last_offline_at TIMESTAMP DEFAULT NULL,
  last_online_at TIMESTAMP DEFAULT NULL,
  average_online_duration INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_heartbeat_device_id UNIQUE(device_id),
  CONSTRAINT uk_heartbeat_device_no UNIQUE(device_no)
);
CREATE INDEX IF NOT EXISTS idx_heartbeat_status ON fire_device_heartbeat(status);
CREATE INDEX IF NOT EXISTS idx_heartbeat_last ON fire_device_heartbeat(last_heartbeat_at);

-- ───────────────────────────────────────────────────────────────
-- 4. 摄像头档案表
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fire_camera (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  unit_id VARCHAR(64) DEFAULT NULL,
  unit_name VARCHAR(128) DEFAULT NULL,
  location VARCHAR(256) DEFAULT NULL,
  rtsp_url VARCHAR(512) DEFAULT NULL,
  stream_url VARCHAR(512) DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'indoor',
  status VARCHAR(32) DEFAULT 'normal',
  online_status VARCHAR(32) DEFAULT 'offline',
  device_id VARCHAR(64) DEFAULT NULL,
  channel_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_camera_type ON fire_camera(type);
CREATE INDEX IF NOT EXISTS idx_camera_status ON fire_camera(status);
CREATE INDEX IF NOT EXISTS idx_camera_unit ON fire_camera(unit_id);

-- ───────────────────────────────────────────────────────────────
-- 5. 系统待办表
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sys_todo (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(256) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  priority INT DEFAULT 1,
  status INT DEFAULT 0,
  user_id VARCHAR(64) DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_todo_user_status ON sys_todo(user_id, status);
CREATE INDEX IF NOT EXISTS idx_todo_status ON sys_todo(status);
CREATE INDEX IF NOT EXISTS idx_todo_due_date ON sys_todo(due_date);

-- ───────────────────────────────────────────────────────────────
-- 6. 系统公告表
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sys_notice (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(256) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  type VARCHAR(32) DEFAULT 'system',
  priority INT DEFAULT 1,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notice_type ON sys_notice(type);
CREATE INDEX IF NOT EXISTS idx_notice_status ON sys_notice(status);
CREATE INDEX IF NOT EXISTS idx_notice_priority ON sys_notice(priority);

-- ───────────────────────────────────────────────────────────────
-- 7. 认证相关表
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sys_refresh_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL,
  username VARCHAR(64) NOT NULL,
  roles JSONB,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON sys_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires_at ON sys_refresh_tokens(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- 8. Sequelize 模型管理表说明
-- ═══════════════════════════════════════════════════════════════
--
-- 以下表由 Sequelize 模型在应用首次启动时自动创建（sequelize.sync()）：
--   fire_unit, fire_device, fire_device_maintenance, fire_iot_device,
--   fire_protocol_config, fire_data_pipeline, fire_alarm, fire_control_room,
--   fire_control_room_host, fire_multiline_panel, fire_bus_point,
--   fire_host_command_log, fire_host_device_code, fire_patrol_record,
--   fire_hazard, fire_plan, fire_drill, fire_drill_participant,
--   fire_inspection, fire_inspection_item, fire_document, fire_doc_category,
--   fire_notification, fire_duty_schedule, fire_duty_shift, fire_duty_log,
--   fire_duty_handover, fire_dispatch_record, fire_system_log,
--   fire_floor_plan, fire_building, fire_floor, floor_device_positions,
--   floor_camera_bindings, fire_report, fire_report_template, fire_screen_config,
--   fire_training, fire_training_record, fire_ai_decision, fire_ai_alert,
--   fire_linkage_rule, fire_linkage_record, fire_maint_contract,
--   fire_maint_company, fire_maint_work_order, fire_subsystem, fire_subsystem_log,
--   fire_knowledge_doc, doc_categories, sys_user, sys_role, sys_permission,
--   sys_user_role, sys_role_permission, sys_department, sys_log, sys_config,
--   sys_operation_log, buildings, floors, ctwing_raw_log, iot_telemetry
--
-- 生产环境启动参数：sequelize.sync({ alter: false, force: false })
-- 确保不会自动修改已有表结构。
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 9. 高频业务索引（模型同步后建议手动补充）
-- ───────────────────────────────────────────────────────────────

-- fire_device 高频索引
CREATE INDEX IF NOT EXISTS idx_fire_device_lifecycle_created ON fire_device(lifecycle_status, created_at);
CREATE INDEX IF NOT EXISTS idx_fire_device_search ON fire_device(device_no, device_name, device_sn);
CREATE INDEX IF NOT EXISTS idx_fire_device_unit_status ON fire_device(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_fire_device_unit_lifecycle ON fire_device(unit_id, lifecycle_status);

-- fire_alarm 高频索引
CREATE INDEX IF NOT EXISTS idx_fire_alarm_type_status_time ON fire_alarm(alarm_type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_device_created ON fire_alarm(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_unit_created ON fire_alarm(unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fire_alarm_status_created ON fire_alarm(status, created_at);

-- fire_iot_device 索引
CREATE INDEX IF NOT EXISTS idx_iot_device_status_online ON fire_iot_device(status, last_online);
CREATE INDEX IF NOT EXISTS idx_iot_device_ctwing ON fire_iot_device(ctwing_device_id);

-- fire_patrol_record 索引
CREATE INDEX IF NOT EXISTS idx_patrol_unit_date ON fire_patrol_record(unit_id, patrol_date);

-- fire_maint_work_order 索引
CREATE INDEX IF NOT EXISTS idx_maint_unit_status ON fire_maint_work_order(unit_id, status);

-- sys_log 索引
CREATE INDEX IF NOT EXISTS idx_syslog_user_created ON sys_log(user_id, created_at);

-- dispatch_record 索引
CREATE INDEX IF NOT EXISTS idx_dispatch_alarm_phase ON dispatch_record(alarm_id, phase);

-- ───────────────────────────────────────────────────────────────
-- 10. PostgreSQL 特有索引与优化
-- ───────────────────────────────────────────────────────────────

-- 知识库全文检索 GIN 索引（simple 配置，不词干提取，兼容中文）
CREATE INDEX IF NOT EXISTS idx_knowledge_fts ON fire_knowledge_doc USING GIN (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
);

-- floor_camera_bindings 唯一索引（支持 ON CONFLICT UPSERT）
CREATE UNIQUE INDEX IF NOT EXISTS uk_floor_camera ON floor_camera_bindings(floor_id, camera_device_id);
