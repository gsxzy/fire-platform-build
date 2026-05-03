SELECT 
  id, device_id, name, on_line, server_id,
  (SELECT count(0) FROM wvp_device_channel dc WHERE dc.data_type = 1 and dc.data_device_id = de.id) as channel_count
FROM wvp_device de
WHERE 1 = 1
ORDER BY create_time desc, device_id;
