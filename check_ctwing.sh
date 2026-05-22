#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_id, msg_type, created_at FROM fire_platform.ctwing_raw_log ORDER BY id DESC LIMIT 5;"
echo "---"
mysql -uroot -p"$DB_PASS" -e "SELECT COUNT(*) as total FROM fire_platform.ctwing_raw_log;"
echo "---"
mysql -uroot -p"$DB_PASS" -e "SELECT COUNT(*) as alarms_today FROM fire_platform.fire_alarm WHERE DATE(created_at) = CURDATE();"
