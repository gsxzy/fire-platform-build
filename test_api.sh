#!/bin/bash
TOKEN=$(curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."
curl -s "http://127.0.0.1:5003/api/control-rooms?pageSize=9999" -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""
curl -s "http://127.0.0.1:5003/api/control-rooms/hosts?roomId=1" -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""
