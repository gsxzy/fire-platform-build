import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

pw = 'Xzy@2025'

# Check control_room_video for CAM-003
stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT camera_no, room_id FROM control_room_video WHERE camera_no = \"CAM-003\";'")
print('control_room_video CAM-003:', stdout.read().decode())

# Re-insert CAM-003 into control_room_video if missing
stdin, stdout, stderr = ssh.exec_command(f"""
mysql -u root -p'{pw}' -D fire_platform -e "
INSERT INTO control_room_video (room_id, camera_name, camera_no, stream_url, protocol, status, position, sort_order)
VALUES ('CR-002', '车库入口摄像头', 'CAM-003', '', 'HLS', 1, 'B1车库入口', 0)
ON DUPLICATE KEY UPDATE camera_name = '车库入口摄像头', position = 'B1车库入口';
"
""")
print('Re-insert CR:', stdout.read().decode())

# Re-insert CAM-003 into cameras
stdin, stdout, stderr = ssh.exec_command(f"""
mysql -u root -p'{pw}' -D fire_platform -e "
INSERT INTO cameras (id, name, unit_id, unit_name, location, stream_url, type, status, online_status)
VALUES ('CAM-003', '车库入口摄像头', 'CR-002', 'CR-002', 'B1车库入口', '', 'indoor', 'normal', 'online')
ON DUPLICATE KEY UPDATE name = '车库入口摄像头', location = 'B1车库入口';
"
""")
print('Re-insert cameras:', stdout.read().decode())

# Verify both tables
stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id, name FROM cameras;'")
print('Cameras:')
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT camera_no, room_id FROM control_room_video;'")
print('control_room_video:')
print(stdout.read().decode())

ssh.close()
