import paramiko, json, sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# 1. Get WVP token
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
wvp_token = resp['data']['accessToken']

print("=== 1. WVP 设备列表 ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/device/query/devices?page=1&count=100' -H 'access-token: {wvp_token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
try:
    d = json.loads(body)
    devices = d.get('data', {}).get('list', [])
    print(f"设备总数: {d.get('data',{}).get('total',0)}")
    for dev in devices:
        print(f"  ID={dev.get('deviceId','?')} Name={dev.get('name','?')} Online={dev.get('onLine',dev.get('online','?'))} IP={dev.get('ip','?')}")
except Exception as e:
    print(f"解析失败: {e}")
    print(body[:500])

print("\n=== 2. ZLMediaKit 进程 ===")
stdin, stdout, stderr = client.exec_command("ps aux | grep -i zlmedia | grep -v grep || echo 'ZLMediaKit not running'")
print(stdout.read().decode('utf-8', errors='replace').strip())

print("\n=== 3. WVP 相关端口监听 ===")
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep -E ':(18080|5060|10000|554|1935|8080|80|443|6080)' || netstat -tlnp | grep -E ':(18080|5060|10000|554|1935|8080|80|443|6080)'")
print(stdout.read().decode('utf-8', errors='replace').strip())

print("\n=== 4. 检查 cameras 表数据 ===")
stdin, stdout, stderr = client.exec_command(
    "mysql -uroot -p'Zhangcong2255' -e 'SELECT id, name, device_id, channel_id, status, stream_url FROM fire_platform.cameras LIMIT 10;' 2>&1"
)
print(stdout.read().decode('utf-8', errors='replace').strip())

print("\n=== 5. 检查前端 VITE_WVP_ENABLED 配置 ===")
stdin, stdout, stderr = client.exec_command(
    "grep -r 'WVP_ENABLED\|wvp_enabled\|VITE_WVP' /www/wwwroot/fire-platform/ /www/wwwroot/fire-platform/assets/*.js 2>/dev/null | head -5"
)
print(stdout.read().decode('utf-8', errors='replace').strip() or '未找到配置')

print("\n=== 6. 测试播放接口（如果有设备） ===")
if devices:
    dev = devices[0]
    device_id = dev.get('deviceId')
    # Get channels
    stdin, stdout, stderr = client.exec_command(
        f"curl -s 'http://127.0.0.1:18080/api/device/query/devices/{device_id}/channels?page=1&count=10' -H 'access-token: {wvp_token}'"
    )
    ch_resp = stdout.read().decode('utf-8', errors='replace')
    try:
        ch = json.loads(ch_resp)
        channels = ch.get('data', {}).get('list', [])
        print(f"  设备 {device_id} 通道数: {ch.get('data',{}).get('total',0)}")
        for c in channels[:3]:
            print(f"    Channel={c.get('channelId','?')} Name={c.get('name','?')} Status={c.get('status','?')}")
        if channels:
            ch_id = channels[0].get('channelId')
            # Try play
            stdin, stdout, stderr = client.exec_command(
                f"curl -s 'http://127.0.0.1:18080/api/play/start/{device_id}/{ch_id}' -H 'access-token: {wvp_token}'"
            )
            play = stdout.read().decode('utf-8', errors='replace')
            try:
                pd = json.loads(play)
                print(f"  播放接口: code={pd.get('code')}, msg={pd.get('msg')}")
                pdata = pd.get('data', {})
                for k in ['flv', 'hls', 'rtmp', 'wsFlv', 'rtc']:
                    v = pdata.get(k, '')
                    if v:
                        print(f"    {k}: {v}")
            except:
                print(f"  播放响应: {play[:200]}")
    except:
        print(f"  通道查询失败: {ch_resp[:200]}")

print("\n=== 7. 检查 fire-api 视频路由日志 ===")
stdin, stdout, stderr = client.exec_command(
    "grep -i 'video\|stream\|play\|wvp' /opt/my-fire-api/logs/out.log | tail -10"
)
print(stdout.read().decode('utf-8', errors='replace').strip() or '无相关日志')

client.close()
