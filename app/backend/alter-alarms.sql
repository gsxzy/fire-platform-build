ALTER TABLE alarms MODIFY status ENUM('new','confirmed','handled','ignored','pending','processing','resolved') DEFAULT 'new';
UPDATE alarms SET status = 'new' WHERE status = 'pending';
UPDATE alarms SET alarm_type = CASE alarm_type
  WHEN '报警/状态' THEN 'fire'
  WHEN '故障' THEN 'fault'
  WHEN '用传复位' THEN 'supervisory'
  ELSE alarm_type
END;
