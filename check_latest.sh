#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT COUNT(*) as total FROM fire_platform.ctwing_raw_log;"
mysql -uroot -p"$DB_PASS" -e "SELECT MAX(id) as max_id FROM fire_platform.ctwing_raw_log;"
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_id, msg_type, created_at FROM fire_platform.ctwing_raw_log ORDER BY id DESC LIMIT 3;"
