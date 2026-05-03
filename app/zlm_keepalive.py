import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Simulate ZLM keepalive
payload = {
    "data": {
        "mediaServerId": "polaris",
        "ip": "124.223.35.58",
        "httpPort": 8081,
        "rtmpPort": 10001,
        "rtpProxyPort": 10003,
        "rtspPort": 10002,
        "rtcPort": 8000,
        "srtPort": 9000,
        "flvPort": 8081,
        "wsFlvPort": 8081,
        "mp4Port": 0,
        "httpSSLPort": 0,
        "rtmpSSLPort": 0,
        "rtspSSLPort": 0,
        "wsFlvSSLPort": 0,
        "flvSSLPort": 0,
        "mp4SSLPort": 0,
        "rtpEnable": False,
        "rtpPortRange": "30000-30500",
        "sendRtpPortRange": "50000-55000",
        "recordAssistPort": 0,
        "hookAliveInterval": 10,
        "recordPath": "./www/record",
        "recordDay": 7,
        "secret": "clKwNbLRJ1LgJ6xPcmd767mVX5xn5tgz",
    },
    "hook_index": 1
}

stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST 'http://127.0.0.1:18080/index/hook/on_server_keepalive' -H 'Content-Type: application/json' -d '{json.dumps(payload, ensure_ascii=False)}'"
)
print("Keepalive:", stdout.read().decode('utf-8', errors='replace'))

# Also trigger on_server_started
payload2 = {
    "data": {
        "mediaServerId": "polaris",
        "ip": "124.223.35.58",
        "httpPort": 8081,
        "secret": "clKwNbLRJ1LgJ6xPcmd767mVX5xn5tgz",
    },
    "hook_index": 1
}

stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST 'http://127.0.0.1:18080/index/hook/on_server_started' -H 'Content-Type: application/json' -d '{json.dumps(payload2, ensure_ascii=False)}'"
)
print("Started:", stdout.read().decode('utf-8', errors='replace'))

client.close()
