#!/bin/bash
set -e

# Login to backend
LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

# Activate Camera 01 stream
curl -s -X POST 'http://127.0.0.1:5003/api/video/stream' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"deviceId":"34020000001300000001","channelId":"34020000001300000001"}' > /dev/null 2>&1

sleep 2

# Test nginx proxy
echo "=== Direct ZLM ==="
curl -s --max-time 5 'http://127.0.0.1:8081/rtp/34020000001300000001_34020000001300000001/hls.m3u8?originTypeStr=rtp_push&videoCodec=H264' | head -n 5

echo "=== Nginx Proxy ==="
curl -s -k --max-time 5 -H 'Host: www.xzyzh.top' 'https://127.0.0.1/zlm/rtp/34020000001300000001_34020000001300000001/hls.m3u8?originTypeStr=rtp_push&videoCodec=H264' | head -n 5
