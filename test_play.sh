#!/bin/bash
sleep 15
TOKEN=$(curl -s "http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "TOKEN=${TOKEN:0:30}..."
curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "access-token: $TOKEN" --max-time 35 "http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001"
