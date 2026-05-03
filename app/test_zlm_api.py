import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

secret = "clKwNbLRJ1LgJ6xPcmd767mVX5xn5tgz"

# Test openRtpServer
print("=== openRtpServer ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:8081/index/api/openRtpServer?secret={secret}&port=0&tcp_mode=0&stream_id=test123'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(body[:300])

# Test getServerInfo
print("\n=== getServerInfo ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:8081/index/api/getServerInfo?secret={secret}'"
)
body = stdout.read().decode('utf-8', errors='replace')
try:
    d = json.loads(body)
    print(f"code={d.get('code')}, data keys={list(d.get('data',{}).keys())}")
except:
    print(body[:200])

# Test getMediaList
print("\n=== getMediaList ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:8081/index/api/getMediaList?secret={secret}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(body[:200])

client.close()
