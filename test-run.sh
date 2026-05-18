#!/bin/bash
cd /opt/my-fire-api-new
node dist/app.js > /tmp/app-out.log 2> /tmp/app-err.log &
APP_PID=$!
echo "PID: $APP_PID"
sleep 10
ps -p $APP_PID -o pid,cmd 2>&1 || echo "PROCESS_DEAD"
curl -fs http://localhost:5003/api/health 2>&1 || echo "HEALTH_FAIL"
kill $APP_PID 2>/dev/null
wait $APP_PID 2>/dev/null
echo '---OUT---'
cat /tmp/app-out.log
echo '---ERR---'
cat /tmp/app-err.log
