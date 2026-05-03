#!/bin/bash
echo "=== Test PATCH alarm ==="
curl -s -X PATCH -H 'Content-Type: application/json' -d '{"status":"confirmed","handler":"值班人员","handleTime":"2026-04-28T08:30:00.000Z","handleNote":"值守确认"}' http://127.0.0.1:5004/api/alarms/1
echo ""
echo "=== Test PUT device ==="
curl -s -X PUT -H 'Content-Type: application/json' -d '{"name":"test","unitName":"万达广场商业中心"}' http://127.0.0.1:5004/api/devices/1
echo ""
