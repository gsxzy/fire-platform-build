#!/bin/bash
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT device_no, iot_id, device_sn, status, ip, last_online, device_name FROM fire_device WHERE device_no LIKE '%3402000000130000000%' OR iot_id LIKE '%3402000000130000000%' OR device_sn LIKE '%3402000000130000000%';" 2>/dev/null
echo '--- all devices ---'
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT device_no, device_name, status, ip, last_online FROM fire_device LIMIT 30;" 2>/dev/null
