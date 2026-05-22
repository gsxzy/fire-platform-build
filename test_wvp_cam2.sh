#!/bin/bash
set -e

# Get WVP token
curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3' > /tmp/wvp_token.json
TOKEN=$(python3 -c 'import json; d=json.load(open("/tmp/wvp_token.json")); print(d["data"]["accessToken"])')

echo "=== WVP Camera 02 test ==="
curl -s 'http://127.0.0.1:18080/api/play/start/34020000001300000002/34020000001320000002' -H "access-token: $TOKEN" | python3 -m json.tool
