import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# 1. insertAlarm 增加 eventTime 参数
content = content.replace(
    'async function insertAlarm(deviceId, alarmType, alarmLevel, description, rawData) {',
    'async function insertAlarm(deviceId, alarmType, alarmLevel, description, rawData, eventTime) {'
)

# 2. SQL 中的 NOW() 改为 COALESCE
content = content.replace(
    "VALUES (?, ?, ?, ?, 'new', NOW())",
    "VALUES (?, ?, ?, ?, 'new', COALESCE(?, NOW()))"
)

# 3. execute 增加 eventTime 参数
content = content.replace(
    "await dbPool.execute(sql, [deviceId, alarmType, alarmLevel, desc]);",
    "await dbPool.execute(sql, [deviceId, alarmType, alarmLevel, desc, eventTime]);"
)

# 4. 0x03 handler
content = content.replace(
    "await insertAlarm(deviceId, 'fire', 'high', desc, frame.raw);",
    "await insertAlarm(deviceId, 'fire', 'high', desc, frame.raw, eventTime);"
)

# 5. 0x04 handler
content = content.replace(
    "await insertAlarm(deviceId, 'fault', 'normal', desc, frame.raw);",
    "await insertAlarm(deviceId, 'fault', 'normal', desc, frame.raw, eventTime);"
)

# 6. 0x05 handler
content = content.replace(
    "await insertAlarm(deviceId, 'supervisory', 'low', `FSCN8001用传复位 time=${frame.timestampStr}`, frame.raw);",
    "await insertAlarm(deviceId, 'supervisory', 'low', `FSCN8001用传复位 time=${frame.timestampStr}`, frame.raw, frame.timestampStr);"
)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

sftp.close()
client.close()
print('File updated successfully')
