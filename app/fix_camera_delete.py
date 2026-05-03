import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

pw = 'Xzy@2025'

# 1. Check if control_room_video data should be synced to cameras
print("=== Checking control_room_video vs cameras ===")
stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT camera_no, camera_name, stream_url, position, room_id FROM control_room_video;'")
print(stdout.read().decode())

# 2. Sync control_room_video data to cameras table (if not exists)
sync_sql = f"""
mysql -u root -p'{pw}' -D fire_platform -e "
INSERT INTO cameras (id, name, unit_id, unit_name, location, stream_url, type, status, online_status)
SELECT 
  v.camera_no AS id,
  v.camera_name AS name,
  v.room_id AS unit_id,
  v.room_id AS unit_name,
  v.position AS location,
  v.stream_url,
  'indoor' AS type,
  CASE WHEN v.status = 1 THEN 'normal' ELSE 'fault' END AS status,
  CASE WHEN v.status = 1 THEN 'online' ELSE 'offline' END AS online_status
FROM control_room_video v
LEFT JOIN cameras c ON v.camera_no = c.id
WHERE c.id IS NULL
ON DUPLICATE KEY UPDATE
  name = v.camera_name,
  location = v.position,
  stream_url = v.stream_url,
  status = CASE WHEN v.status = 1 THEN 'normal' ELSE 'fault' END,
  online_status = CASE WHEN v.status = 1 THEN 'online' ELSE 'offline' END;
"
"""
stdin, stdout, stderr = ssh.exec_command(sync_sql)
out = stdout.read().decode()
err = stderr.read().decode()
print('Sync result:', out)
if err.strip() and 'Warning' not in err:
    print('Sync ERR:', err)

# 3. Verify cameras table now has data
stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id, name, status, online_status FROM cameras;'")
print('Cameras after sync:')
print(stdout.read().decode())

# 4. Check cameras count
stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) as count FROM cameras;'")
print('Camera count:', stdout.read().decode().strip())

ssh.close()
