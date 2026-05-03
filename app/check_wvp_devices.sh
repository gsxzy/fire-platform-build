#!/bin/bash
curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=admin' > /tmp/login.json
TOKEN=$(cat /tmp/login.json | sed 's/.*accessToken":"\([^"]*\)".*/\1/')
echo "=== WVP Devices ==="
curl -s "http://127.0.0.1:18080/api/device/query/devices?page=1&count=100" -H "access-token: $TOKEN"
echo ""
echo "=== WVP Log (last 20 lines) ==="
tail -20 /opt/wvp/logs/console.log
