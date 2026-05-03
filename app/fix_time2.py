import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Replace COALESCE with direct parameter
content = content.replace(
    "VALUES (?, ?, ?, ?, 'new', COALESCE(?, NOW()))",
    "VALUES (?, ?, ?, ?, 'new', ?)"
)

# Replace execute call - eventTime fallback in JS
content = content.replace(
    "await dbPool.execute(sql, [deviceId, alarmType, alarmLevel, desc, eventTime]);",
    "const dbTime = eventTime || new Date().toISOString().slice(0, 19).replace('T', ' ');\n    await dbPool.execute(sql, [deviceId, alarmType, alarmLevel, desc, dbTime]);"
)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

sftp.close()
client.close()
print('File updated successfully')
