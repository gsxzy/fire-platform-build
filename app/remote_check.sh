#!/bin/bash
TOKEN=$(curl -s "http://124.223.35.58/wvp/api/user/login?username=admin&password=admin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])")
curl -s "http://124.223.35.58/wvp/api/device/query/devices?page=1&count=10" -H "access-token: $TOKEN" | python3 /tmp/check_device.py
