import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# Kill old process
stdin, stdout, stderr = client.exec_command("ps aux | grep 'fscn8001Server.js' | grep -v grep")
lines = stdout.read().decode().strip().split('\n')
for line in lines:
    parts = line.split()
    if len(parts) >= 2 and parts[1].isdigit():
        pid = parts[1]
        print(f'Killing PID {pid}')
        client.exec_command(f'kill {pid}')

import time
time.sleep(2)
client.exec_command('cd /opt/fscn8001 && nohup node fscn8001Server.js >> fscn8001.log 2>&1 &')
print('Restarted fscn8001Server.js')

time.sleep(3)

# Verify camera API
stdin, stdout, stderr = client.exec_command("curl -s 'http://127.0.0.1:5004/api/control-rooms/videos?roomId=1' | python3 -m json.tool 2>/dev/null || echo 'API check'"
)
print('Camera API test:')
print(stdout.read().decode())

client.close()
print('Done')
