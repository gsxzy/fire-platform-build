import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Try to play with guessed channel IDs
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
import json
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

device_id = '34020000001300000001'
# GB28181 channel IDs: typically deviceId with resource type changed
# e.g., 34020000001300000001 -> 34020000001320000001 (200 = video channel)
# or 34020000001310000001 (100 = alarm input)
guessed_ids = [
    '34020000001320000001',
    '34020000001310000001', 
    '34020000001300000001',
    '1',
    '2',
]

for ch_id in guessed_ids:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s --max-time 15 'http://127.0.0.1:18080/api/play/start/{device_id}/{ch_id}' -H 'access-token: {token}'"
    )
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        code = d.get('code')
        msg = d.get('msg', '')
        print(f"channelId={ch_id} -> code={code} msg={msg}")
        if code == 0:
            print(f"  SUCCESS! Data: {json.dumps(d.get('data',{}), indent=2, ensure_ascii=False)[:500]}")
            break
    except:
        print(f"channelId={ch_id} -> parse error: {body[:100]}")

# Also try device 34020000001320000002
device_id2 = '34020000001320000002'
for ch_id in ['34020000001320000002', '34020000001300000002', '1']:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s --max-time 15 'http://127.0.0.1:18080/api/play/start/{device_id2}/{ch_id}' -H 'access-token: {token}'"
    )
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        code = d.get('code')
        msg = d.get('msg', '')
        print(f"device2 channelId={ch_id} -> code={code} msg={msg}")
        if code == 0:
            print(f"  SUCCESS! Data: {json.dumps(d.get('data',{}), indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"device2 channelId={ch_id} -> parse error: {body[:100]}")

client.close()
