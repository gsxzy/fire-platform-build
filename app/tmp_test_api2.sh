#!/bin/bash
echo "=== Test GET devices list ==="
curl -s 'http://127.0.0.1:5004/api/devices/list?page=1&pageSize=5' | head -c 500
echo ""
echo "=== Test POST device ==="
curl -s -X POST -H 'Content-Type: application/json' -d '{"id":"GB-TEST-001","name":"测试设备","type":"camera","unitName":"万达广场商业中心"}' http://127.0.0.1:5004/api/devices
echo ""
echo "=== Test PUT device by device_id ==="
curl -s -X PUT -H 'Content-Type: application/json' -d '{"name":"测试设备已修改","unitName":"兰州大学第二医院"}' http://127.0.0.1:5004/api/devices/GB-TEST-001
echo ""
