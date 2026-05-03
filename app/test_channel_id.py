import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/device/query/devices/34020000001300000001/channels?page=1&count=10' -H 'access-token: {token}'"
)
d = json.loads(stdout.read().decode('utf-8', errors='replace'))
channels = d.get('data', {}).get('list', [])
for ch in channels:
    print(f"id={ch.get('id')} deviceId={ch.get('deviceId')} name={ch.get('name')} status={ch.get('status')}")
    # Try to find channelId-like field
    for k, v in ch.items():
        if k.lower() in ['channelid', 'channel_id', 'code', 'channel_code'] and v:
            print(f"  -> {k}={v}")

client.close()
