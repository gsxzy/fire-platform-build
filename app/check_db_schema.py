import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 查看 fire_host 表结构
stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"DESCRIBE fire_platform.fire_host;\"")
out = stdout.read().decode('utf-8', errors='replace')
print('=== fire_host ===')
print(out)

# 查看 control_room_realtime 表结构
stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"DESCRIBE fire_platform.control_room_realtime;\"")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== control_room_realtime ===')
print(out)

# 查看 fscn8001_alarm 表结构
stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"DESCRIBE fire_platform.fscn8001_alarm;\"")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== fscn8001_alarm ===')
print(out)

# 查看 control_room_video 表结构
stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"DESCRIBE fire_platform.control_room_video;\"")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== control_room_video ===')
print(out)

ssh.close()
