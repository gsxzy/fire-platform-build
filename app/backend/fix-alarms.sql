UPDATE alarms SET
  alarm_type = CASE alarm_type
    WHEN '报警/状态' THEN 'fire'
    WHEN '故障' THEN 'fault'
    WHEN '用传复位' THEN 'supervisory'
    ELSE alarm_type
  END,
  status = CASE status
    WHEN 'pending' THEN 'new'
    ELSE status
  END;
SELECT ROW_COUNT();
