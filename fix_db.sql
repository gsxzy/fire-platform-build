USE fire_platform;
ALTER TABLE fire_iot_device ADD COLUMN device_sn VARCHAR(100) NULL AFTER id, ADD UNIQUE INDEX uk_device_sn (device_sn);
