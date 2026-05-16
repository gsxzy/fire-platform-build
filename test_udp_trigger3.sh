#!/bin/bash
set -x

# Send UDP packet to camera to trigger NAT mapping using bash
exec 3<>/dev/udp/42.91.136.196/34107
echo -n "trigger" >&3
exec 3<&-
exec 3>&-
echo "UDP sent to camera"
sleep 1

# Get token
LOGIN_RESP=$(curl -s "http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3")
echo "LOGIN_RESP=$LOGIN_RESP"
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "TOKEN=${TOKEN:0:30}..."

# Play
PLAY_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "access-token: $TOKEN" --max-time 30 "http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001")
echo "PLAY_RESP=$PLAY_RESP"
