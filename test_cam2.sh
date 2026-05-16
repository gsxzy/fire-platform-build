#!/bin/bash
# Login WVP
TOKEN=$(curl -s "http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "WVP_TOKEN=${TOKEN:0:30}..."

# Test camera 02 (with ID mapping 34020000001300000002 -> 34020000001320000002)
echo "=== Camera 02 (mapped) ==="
curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "access-token: $TOKEN" --max-time 35 "http://127.0.0.1:18080/api/play/start/34020000001320000002/34020000001320000002"

# Also test without mapping
echo ""
echo "=== Camera 02 (original) ==="
curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "access-token: $TOKEN" --max-time 35 "http://127.0.0.1:18080/api/play/start/34020000001300000002/34020000001300000002"
