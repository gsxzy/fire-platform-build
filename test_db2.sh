#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2)

echo "=== control_room_video ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, room_id, camera_name, camera_no, status FROM fire_platform.control_room_video;" 2>/dev/null

echo ""
echo "=== fire_device gb28181-camera ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_name, device_sn, unit_id, device_type FROM fire_platform.fire_device WHERE device_type='gb28181-camera' LIMIT 10;" 2>/dev/null
