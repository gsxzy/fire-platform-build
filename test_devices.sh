#!/bin/bash
set -e

LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

echo "=== Devices (page 1) ==="
curl -s "http://127.0.0.1:5003/api/devices?pageSize=5" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -E 'device_name|device_type|device_sn' | head -n 20

echo ""
echo "=== WVP Devices ==="
curl -s "http://127.0.0.1:5003/api/video/devices" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -n 30
