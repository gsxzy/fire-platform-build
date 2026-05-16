#!/bin/bash
mysql -uroot -pZhangcong2255 fire_platform -N -e "SHOW TABLES LIKE 'fire_device';" 2>/dev/null
echo '---'
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fire_device' AND TABLE_SCHEMA='fire_platform';" 2>/dev/null
echo '---'
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT device_id,status,ip,last_online FROM fire_device ORDER BY id DESC LIMIT 10;" 2>/dev/null
echo '---'
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT * FROM fire_device WHERE device_id='34020000001300000001' OR device_id='34020000001300000002' OR code='34020000001300000001' OR code='34020000001300000002' OR sip_id='34020000001300000001' OR sip_id='34020000001300000002';" 2>/dev/null
