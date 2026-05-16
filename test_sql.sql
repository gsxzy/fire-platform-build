USE fire_platform;
SELECT `id`, `device_sn`, `device_name`, `device_type`, `protocol_type`, `protocol_config`, `unit_id`, `status`, `last_online`, `ip_address`, `port`, `data_format`, `created_at` AS `createdAt`, `updated_at` AS `updatedAt` FROM `fire_iot_device` AS `iot_device` LIMIT 0, 500;
