USE fire_platform;

-- 创建 AI 故障自学习知识库表
CREATE TABLE IF NOT EXISTS `fire_issue_history` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `device_id` varchar(64) NOT NULL COMMENT '设备ID',
  `device_name` varchar(128) DEFAULT '' COMMENT '设备名称',
  `issue_type` varchar(50) NOT NULL COMMENT '故障类型: camera_offline/device_fault/network_error/sip_ban/etc',
  `symptoms` text COMMENT '症状描述',
  `root_cause` text COMMENT '根因分析',
  `solution` text COMMENT '解决方案',
  `status` tinyint DEFAULT '0' COMMENT '0未解决 1已解决 2重复发生',
  `occurrence_count` int DEFAULT '1' COMMENT '累计发生次数',
  `source_ip` varchar(50) DEFAULT NULL COMMENT '相关IP地址',
  `resolved_by` varchar(50) DEFAULT NULL COMMENT '解决人',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_issue` (`device_id`,`issue_type`),
  KEY `idx_issue_type` (`issue_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI故障自学习知识库';

-- 修复 fire_device 表缺少 protocol_config 字段的问题
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'fire_platform' AND table_name = 'fire_device' AND column_name = 'protocol_config');
SET @sql := IF(@exist = 0, 'ALTER TABLE fire_device ADD COLUMN protocol_config TEXT COMMENT "协议配置" AFTER device_sn', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
