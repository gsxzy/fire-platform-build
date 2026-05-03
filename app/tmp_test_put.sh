#!/bin/bash
curl -s -X PUT -H 'Content-Type: application/json' -d '{"name":"测试设备已修改","unitName":"兰州大学第二医院"}' http://127.0.0.1:5004/api/devices/GB-TEST-001
echo ""
