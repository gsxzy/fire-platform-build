#!/bin/bash
LOG=/tmp/tcpdump.log
PIDFILE=/tmp/tcpdump.pid

# Start tcpdump in background
timeout 25 tcpdump -i any -nn -q udp src 42.91.136.196 > "$LOG" 2>&1 &
echo $! > "$PIDFILE"
sleep 2

# Get WVP token
TOKEN=$(curl -s "http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "TOKEN=${TOKEN:0:30}..."

# Call play API
curl -s -H "access-token: $TOKEN" --max-time 20 "http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001"
echo ""

sleep 5
kill $(cat "$PIDFILE") 2>/dev/null
echo "=== TCPDUMP OUTPUT ==="
cat "$LOG"
