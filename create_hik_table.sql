CREATE TABLE IF NOT EXISTS fire_platform.hikvision4g_raw_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_sn VARCHAR(100) NOT NULL,
  event_type VARCHAR(32) DEFAULT NULL,
  raw_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_sn (device_sn),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
