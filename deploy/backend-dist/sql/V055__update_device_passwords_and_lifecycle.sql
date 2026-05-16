-- ============================================================
-- Flyway Migration V055
-- 设备密码更新与生命周期状态修复
-- 源文件: update_sip_pwd.sql + fix-lifecycle.sql + clear_mock_data.sql
-- ============================================================

-- 1. 更新 GB28181 设备默认密码
UPDATE gb28181_devices SET password='Wvp@Secure#2024!' WHERE password IS NULL OR password='';

-- 2. 海康4G设备生命周期状态修复
UPDATE fire_device SET lifecycle_status = 2 WHERE protocol_type = 'Hikvision4G' AND lifecycle_status < 2;

-- 3. 清理演示数据（如存在 fire_issue_history 表）
DELETE FROM fire_issue_history WHERE 1=1;
