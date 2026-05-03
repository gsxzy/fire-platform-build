import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Fix the broken line
content = content.replace(
    "handler('resolved_by = ?'); params.push(data.handler); }",
    "if (data.handler) { setParts.push('resolved_by = ?'); params.push(data.handler); }"
)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

sftp.close()

# Verify
stdin, stdout, stderr = client.exec_command("sed -n '540,550p' /opt/fscn8001/fscn8001Server.js")
print('Fixed code:')
print(stdout.read().decode())

# Restart
client.exec_command('cd /opt/fscn8001 && nohup node fscn8001Server.js >> fscn8001.log 2>&1 &')
print('Restarted')

client.close()
