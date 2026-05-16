#!/bin/bash
# Step 1: Login
LOGIN_RESP=$(curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("data",{}).get("accessToken",""))')
echo "Token: $TOKEN"
echo ""

# Step 2: Play
echo "=== Play API Response ==="
curl -s "http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN" | head -c 1000
echo ""
