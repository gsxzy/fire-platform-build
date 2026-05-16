#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzc4MzA0MzQwLCJleHAiOjE3NzgzOTA3NDB9.q33-4PGewW0Yq19JQFdjHMoCiGKQ5VfxcXc2eXT9emI"
echo "=== /todos/list ==="
curl -s "http://127.0.0.1:5003/api/todos/list?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 80
echo ""
echo "=== /notifications/list ==="
curl -s "http://127.0.0.1:5003/api/notifications/list?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 80
echo ""
echo "=== /control-rooms/1 ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/1" -H "Authorization: Bearer $TOKEN" | head -c 80
echo ""
echo "=== /video/devices ==="
curl -s "http://127.0.0.1:5003/api/video/devices?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 80
echo ""
echo "=== /iot-devices/list ==="
curl -s "http://127.0.0.1:5003/api/iot-devices/list?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 80
echo ""
