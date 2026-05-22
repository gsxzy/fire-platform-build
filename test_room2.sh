#!/bin/bash
set -e

LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

echo "=== Video list for room 2 (新致远科技) ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/videos?roomId=2" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "=== Video candidates for room 2 ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/video-candidates?roomId=2" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
