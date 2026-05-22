#!/bin/bash
set -e

# Login
LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

echo "=== 1. List control rooms ==="
ROOM_RESP=$(curl -s "http://127.0.0.1:5003/api/control-rooms?pageSize=1" -H "Authorization: Bearer $TOKEN")
echo "$ROOM_RESP" | python3 -m json.tool | grep -E 'id|room_name' | head -n 4

ROOM_ID=$(echo "$ROOM_RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["data"]["list"][0]["id"])')

echo ""
echo "=== 2. Video list for room $ROOM_ID ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/videos?roomId=$ROOM_ID" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "=== 3. Video candidates for room $ROOM_ID ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/video-candidates?roomId=$ROOM_ID" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
