import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# 1. Check alarms table structure
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'DESC alarms'")
print('=== alarms table ===')
print(stdout.read().decode())

# 2. Check control_rooms table to find correct roomId
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SHOW TABLES LIKE \"%control%\"'")
print('=== control room tables ===')
print(stdout.read().decode())

# 3. Check if control_rooms table exists
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT * FROM control_rooms LIMIT 3' 2>&1 || echo 'No control_rooms table'")
print('=== control_rooms data ===')
print(stdout.read().decode())

# 4. Check devices table for unit info
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, device_id, device_name FROM devices LIMIT 3'")
print('=== devices ===')
print(stdout.read().decode())

client.close()
