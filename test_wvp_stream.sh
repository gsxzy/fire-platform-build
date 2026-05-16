#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzc4MzA0MzQwLCJleHAiOjE3NzgzOTA3NDB9.q33-4PGewW0Yq19JQFdjHMoCiGKQ5VfxcXc2eXT9emI"
echo "=== /video/devices full ==="
curl -s "http://127.0.0.1:5003/api/video/devices?page=1&count=20" -H "Authorization: Bearer $TOKEN"
echo ""
echo "=== /video/stream (34020000001300000001) ==="
curl -s -X POST "http://127.0.0.1:5003/api/video/stream" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"deviceId":"34020000001300000001","channelId":"34020000001300000001"}'
echo ""
echo "=== /video/streams ==="
curl -s "http://127.0.0.1:5003/api/video/streams" -H "Authorization: Bearer $TOKEN"
echo ""
