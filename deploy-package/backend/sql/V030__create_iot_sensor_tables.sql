-- ============================================================
-- Flyway Migration V030
-- 创建物联网传感器配置表和传感器实时数据表
-- 源文件: app/sql/fire_control_expand.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS iot_sensor (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  host_id       BIGINT       NOT NULL COMMENT '所属主机ID',
  sensor_code   VARCHAR(64)  NOT NULL COMMENT '传感器编号',
  sensor_type   VARCHAR(32)  NOT NULL COMMENT '传感器类型：pressure(压力)|level(液位)|temp(温度)|humidity(湿度)',
  sensor_name   VARCHAR(64)  DEFAULT NULL COMMENT '传感器名称',
  unit          VARCHAR(16)  DEFAULT NULL COMMENT '单位：Mpa|m|℃|%',
  min_value     DECIMAL(10,3) DEFAULT 0 COMMENT '量程下限',
  max_value     DECIMAL(10,3) DEFAULT 100 COMMENT '量程上限',
  alarm_low     DECIMAL(10,3) DEFAULT NULL COMMENT '低限报警值',
  alarm_high    DECIMAL(10,3) DEFAULT NULL COMMENT '高限报警值',
  location      VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0停用 1正常 2故障',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_host_sensor (host_id, sensor_code),
  INDEX idx_sensor_type (sensor_type),
  INDEX idx_status (status),
  FOREIGN KEY (host_id) REFERENCES fire_host(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物联网传感器配置表';

CREATE TABLE IF NOT EXISTS iot_sensor_data (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  sensor_id     BIGINT       NOT NULL COMMENT '传感器ID',
  sensor_value  DECIMAL(10,3) NOT NULL COMMENT '传感器数值',
  status        TINYINT      DEFAULT 1 COMMENT '状态：0离线 1正常 2低报警 3高报警 4故障',
  record_time   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  INDEX idx_sensor_time (sensor_id, record_time),
  INDEX idx_status (status),
  FOREIGN KEY (sensor_id) REFERENCES iot_sensor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器实时数据表';
