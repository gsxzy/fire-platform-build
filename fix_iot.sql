USE fire_platform;
ALTER TABLE fire_iot_device
  ADD COLUMN device_type VARCHAR(30) NULL AFTER device_name,
  ADD COLUMN protocol_type VARCHAR(20) NULL AFTER device_type,
  ADD COLUMN protocol_config TEXT NULL AFTER protocol_type,
  ADD COLUMN ip_address VARCHAR(50) NULL AFTER last_online,
  ADD COLUMN data_format VARCHAR(20) NULL AFTER port;
