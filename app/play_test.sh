#!/bin/bash
TOKEN=$(curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["data"]["accessToken"])')
echo "=== PLAY ONLINE DEVICE ==="
curl -s -H "access-token: $TOKEN" 'http://127.0.0.1:18080/api/play/start/34020000001320000002/34020000001320000002'
echo ""
