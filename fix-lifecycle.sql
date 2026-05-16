UPDATE fire_platform.fire_device SET lifecycle_status = 2 WHERE protocol_type = 'Hikvision4G' AND lifecycle_status < 2;
SELECT ROW_COUNT() AS updated_rows;
