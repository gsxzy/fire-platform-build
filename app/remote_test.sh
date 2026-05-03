#!/bin/bash
/tmp/test_play.sh &
TOKEN=$(curl -s "http://124.223.35.58/wvp/api/user/login?username=admin&password=admin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])")
curl -s "http://124.223.35.58/wvp/api/play/start/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN" > /dev/null
sleep 18
echo DONE
