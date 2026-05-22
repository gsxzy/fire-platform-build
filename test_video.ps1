# PowerShell script to test video API remotely
$sshHost = "root@124.223.35.58"

# Create test script on remote server
$remoteScript = @'
#!/bin/bash
set -e

# Login
LOGIN_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/auth/login' -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')

# Test video stream for Camera 01
VIDEO_RESP=$(curl -s -X POST 'http://127.0.0.1:5003/api/video/stream' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"deviceId":"34020000001300000001","channelId":"34020000001300000001"}')
echo "$VIDEO_RESP" | python3 -m json.tool
'@

# Write script to remote server via stdin
$remoteScript | ssh $sshHost "cat > /tmp/test_video_api.sh && chmod +x /tmp/test_video_api.sh && bash /tmp/test_video_api.sh"
