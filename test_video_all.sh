#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzc4MzA0MzQwLCJleHAiOjE3NzgzOTA3NDB9.q33-4PGewW0Yq19JQFdjHMoCiGKQ5VfxcXc2eXT9emI"
echo "=== /cameras/list ==="
curl -s "http://127.0.0.1:5003/api/cameras/list?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""
echo "=== /gb28181-devices/list ==="
curl -s "http://127.0.0.1:5003/api/gb28181-devices/list?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""
echo "=== /video/devices ==="
curl -s "http://127.0.0.1:5003/api/video/devices?page=1&count=20" -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""
echo "=== /video/streams ==="
curl -s "http://127.0.0.1:5003/api/video/streams" -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""
