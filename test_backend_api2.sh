#!/bin/bash
# Login
LOGIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://127.0.0.1:5003/api/auth/login)
echo "LOGIN: $LOGIN_RESP"
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "TOKEN=${TOKEN:0:30}..."

# Get play URL
PLAY_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"deviceId":"34020000001300000001","channelId":"34020000001300000001"}' --max-time 45 http://127.0.0.1:5003/api/video/stream)
echo "PLAY: $PLAY_RESP"
