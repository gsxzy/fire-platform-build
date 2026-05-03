import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check WVP logs around play requests
print("=== WVP 播放相关日志 ===")
stdin, stdout, stderr = client.exec_command(
    "grep -n -i -E '开始点播|通道未找到|play|invite|sdp|rtp|stream|34020000001300000001' /opt/wvp/logs/wvp.log | tail -30"
)
print(stdout.read().decode('utf-8', errors='replace'))

# Check if there's a catalog query for channels
print("\n=== 目录查询相关 ===")
stdin, stdout, stderr = client.exec_command(
    "grep -n -i -E 'catalog|channel|目录' /opt/wvp/logs/wvp.log | tail -20"
)
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
