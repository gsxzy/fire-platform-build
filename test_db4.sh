#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2)

echo "=== fire_control_room ==="
mysql -uroot -p"$DB_PASS" -e "SELECT id, room_name, unit_id FROM fire_platform.fire_control_room LIMIT 5;" 2>/dev/null

echo ""
echo "=== control_room_video join fire_control_room ==="
mysql -uroot -p"$DB_PASS" -e "SELECT v.*, r.room_name FROM fire_platform.control_room_video v LEFT JOIN fire_platform.fire_control_room r ON v.room_id = r.id LIMIT 10;" 2>/dev/null
