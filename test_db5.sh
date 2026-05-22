#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2)

echo "=== gb28181-camera devices ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, device_name, device_sn, unit_id FROM fire_platform.fire_device WHERE device_type='gb28181-camera';" 2>/dev/null

echo ""
echo "=== control_room_video all ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, room_id, camera_name, camera_no FROM fire_platform.control_room_video;" 2>/dev/null
