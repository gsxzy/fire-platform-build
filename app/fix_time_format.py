import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Fix: convert ISO time to MySQL datetime format
old = "if (data.handleTime) { setParts.push('resolved_at = ?'); params.push(data.handleTime); }"
new = "if (data.handleTime) { setParts.push('resolved_at = ?'); params.push(data.handleTime.replace('T', ' ').replace('Z', '').slice(0, 19)); }"
content = content.replace(old, new)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

print('Fixed time format')

# Kill and restart
client.exec_command("kill $(ps aux | grep 'fscn8001Server.js' | grep -v grep | awk '{print $2}')")
import time
time.sleep(2)
client.exec_command('cd /opt/fscn8001 && nohup node fscn8001Server.js >> fscn8001.log 2>&1 &')
print('Restarted')

time.sleep(3)

# Test PATCH
stdin, stdout, stderr = client.exec_command(
    "curl -s -X PATCH -H 'Content-Type: application/json' "
    "-d '{\"status\":\"confirmed\",\"handler\":\"值班员A\",\"handleTime\":\"2026-04-28T12:00:00Z\",\"handleNote\":\"值守确认\"}' "
    "'http://127.0.0.1:5004/api/alarms/13'"
)
print('PATCH result:', stdout.read().decode())

# Verify DB
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, status, resolved_by, resolved_at, notes FROM alarms WHERE id=13;'")
print('Alarm 13:')
print(stdout.read().decode())

# Test camera with CR001
stdin, stdout, stderr = client.exec_command("curl -s 'http://127.0.0.1:5004/api/control-rooms/videos?roomId=CR001' | python3 -m json.tool 2>/dev/null")
print('Camera CR001:')
print(stdout.read().decode())

sftp.close()
client.close()
