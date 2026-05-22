#!/bin/bash
set -e

LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

echo "=== Link camera to room 2 ==="
curl -s -X POST 'http://127.0.0.1:5003/api/control-rooms/video-link' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"roomId":2,"cameraNo":"34020000001300000001","cameraName":"海康摄像头2","position":"测试位置"}' | python3 -m json.tool

echo ""
echo "=== Video list for room 2 after link ==="
curl -s "http://127.0.0.1:5003/api/control-rooms/videos?roomId=2" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "=== Unlink camera from room 2 ==="
curl -s -X POST 'http://127.0.0.1:5003/api/control-rooms/video-unlink' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"roomId":2,"cameraNo":"34020000001300000001"}' | python3 -m json.tool
