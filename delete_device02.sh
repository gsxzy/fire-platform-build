#!/bin/bash
TOKEN=$(curl -s "http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "WVP_TOKEN=${TOKEN:0:30}..."

# Try to delete device 02
echo "=== Delete device 02 ==="
curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "access-token: $TOKEN" --max-time 15 -X DELETE "http://127.0.0.1:18080/api/device/query/devices/34020000001300000002"
