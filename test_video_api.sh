#!/bin/bash
set -e

# Login
LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

# Test video stream for Camera 01
echo "=== Camera 01 ==="
VIDEO_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/video/stream' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"deviceId":"34020000001300000001","channelId":"34020000001300000001"}')
echo "$VIDEO_RESP" | python3 -m json.tool

# Test video stream for Camera 02
echo "=== Camera 02 ==="
VIDEO_RESP2=$(curl -s -X POST 'http://127.0.0.1:5003/api/video/stream' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"deviceId":"34020000001300000002","channelId":"34020000001320000002"}')
echo "$VIDEO_RESP2" | python3 -m json.tool
