#!/bin/bash
# Login
RESP=$(curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=admin')
echo "Login resp: $RESP" > /tmp/play_test.log
TOKEN=$(echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["data"]["accessToken"])' 2>/dev/null)
echo "Token: ${TOKEN:0:50}..." >> /tmp/play_test.log

# Stop
STOP=$(curl -s "http://127.0.0.1:18080/api/play/stop/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN")
echo "Stop: $STOP" >> /tmp/play_test.log

# Start
START=$(curl -s "http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001" -H "access-token: $TOKEN")
echo "Start: $START" >> /tmp/play_test.log

cat /tmp/play_test.log
