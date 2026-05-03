#!/bin/bash
TOKEN=$(curl -s "http://124.223.35.58/wvp/api/user/login?username=admin&password=admin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])")
(tcpdump -i any -n -s 0 -A udp port 5060 and host 42.91.142.229 2>&1 | grep -E 'm=video|a=setup|c=IN IP4|INVITE sip' | head -10 > /tmp/tcpdump.log 2>&1) &
sleep 1
curl -s -m 35 "http://124.223.35.58/wvp/api/play/start/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN" > /dev/null
sleep 5
cat /tmp/tcpdump.log
echo DONE
