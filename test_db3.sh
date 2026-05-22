#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2)

echo "=== control_room ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, room_name, unit_id FROM fire_platform.control_room LIMIT 5;" 2>/dev/null

echo ""
echo "=== control_room_video for room_id=1 or room_id=2 ==="
mysql -uroot -p"$DB_PASS" -e "SELECT * FROM fire_platform.control_room_video WHERE room_id='1' OR room_id='2' OR room_id=1 OR room_id=2;" 2>/dev/null

echo ""
echo "=== control_room_video schema ==="
mysql -uroot -p"$DB_PASS" -e "SHOW COLUMNS FROM fire_platform.control_room_video;" 2>/dev/null
