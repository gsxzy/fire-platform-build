#!/bin/bash
TOKEN=$(curl -s "http://124.223.35.58/wvp/api/user/login?username=admin&password=admin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])")
(curl -s "http://124.223.35.58/wvp/api/play/start/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN" > /tmp/play_result.json) &
sleep 1
docker logs --tail 20 wvp-zlm 2>&1 | grep -E 'openRtp|play|42080|44114|44115|test|RtpProcess' | tail -10
cat /tmp/play_result.json | python3 -m json.tool 2>/dev/null || cat /tmp/play_result.json
echo DONE
