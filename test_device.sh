#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2)

echo "=== IoT device ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_sn, device_name, device_type, protocol_type, status, archive_device_id FROM fire_platform.fire_iot_device WHERE device_sn='99013914869646085145332' OR ctwing_device_id='99013914869646085145332' LIMIT 3;" 2>/dev/null

echo ""
echo "=== Archive device ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_name, device_sn, device_type, unit_id, status FROM fire_platform.fire_device WHERE device_sn='869646085145332' OR device_no='869646085145332' LIMIT 3;" 2>/dev/null
