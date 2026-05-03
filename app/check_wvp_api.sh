#!/bin/bash
curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=admin' > /tmp/login3.json
TOKEN=$(cat /tmp/login3.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
curl -s 'http://127.0.0.1:18080/api/device/query/devices?page=1&count=10' -H "access-token: $TOKEN"
