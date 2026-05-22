#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_no, device_sn, device_name FROM fire_platform.fire_device WHERE id=1388;"
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_sn, ctwing_device_id, protocol_type, protocol_config FROM fire_platform.fire_iot_device WHERE archive_device_id=1388;"
