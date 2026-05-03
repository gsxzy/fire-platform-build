import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Get WVP token
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Check ZLM nodes in WVP
print("=== WVP ZLM 节点状态 ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/media_server/all' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(body[:500])

# Get devices
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/device/query/devices?page=1&count=10' -H 'access-token: {token}'"
)
devices = json.loads(stdout.read().decode('utf-8', errors='replace'))
dev_list = devices.get('data', {}).get('list', [])

if dev_list:
    dev = dev_list[0]
    device_id = dev.get('deviceId')
    print(f"\n=== 设备 {device_id} ===")
    
    # Get channels
    stdin, stdout, stderr = client.exec_command(
        f"curl -s 'http://127.0.0.1:18080/api/device/query/devices/{device_id}/channels?page=1&count=10' -H 'access-token: {token}'"
    )
    ch = json.loads(stdout.read().decode('utf-8', errors='replace'))
    channels = ch.get('data', {}).get('list', [])
    print(f"通道数: {ch.get('data',{}).get('total',0)}")
    
    if channels:
        ch_id = channels[0].get('channelId')
        print(f"尝试播放通道: {ch_id}")
        
        stdin, stdout, stderr = client.exec_command(
            f"curl -s 'http://127.0.0.1:18080/api/play/start/{device_id}/{ch_id}' -H 'access-token: {token}'"
        )
        play = stdout.read().decode('utf-8', errors='replace')
        print(f"播放响应: {play[:800]}")
        
        try:
            pd = json.loads(play)
            if pd.get('code') == 0:
                pdata = pd.get('data', {})
                print(f"\n✅ 播放成功!")
                for k in ['flv', 'hls', 'rtmp', 'wsFlv', 'rtc', 'httpsFlv', 'httpsHls']:
                    v = pdata.get(k, '')
                    if v:
                        print(f"  {k}: {v}")
            else:
                print(f"\n❌ 播放失败: code={pd.get('code')}, msg={pd.get('msg')}")
        except Exception as e:
            print(f"解析失败: {e}")
    else:
        print("没有通道")
else:
    print("没有设备")

client.close()
