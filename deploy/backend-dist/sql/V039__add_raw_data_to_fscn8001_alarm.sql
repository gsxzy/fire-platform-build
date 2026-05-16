-- ============================================================
-- Flyway Migration V039
-- 为 fscn8001_alarm 表添加原始帧数据字段
-- 源文件: fix_table.sql
-- ============================================================

ALTER TABLE fscn8001_alarm
  ADD COLUMN IF NOT EXISTS raw_data TEXT NULL COMMENT '原始帧数据' AFTER notes;
