ALTER TABLE fire_platform.fscn8001_alarm ADD COLUMN raw_data TEXT NULL COMMENT '原始帧数据' AFTER notes;
DESC fire_platform.fscn8001_alarm;
