import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# ===== 1. Fix alarms PATCH API: handler -> resolved_by =====
stdin, stdout, stderr = client.exec_command(
    "sed -n '500,530p' /opt/fscn8001/fscn8001Server.js"
)
print('=== Current PATCH code ===')
print(stdout.read().decode())

# Fix: change handler to resolved_by
stdin, stdout, stderr = client.exec_command(
    "sed -i 's/if (data.handler) { setParts.push/handler/; s/handler = ?/resolved_by = ?/' /opt/fscn8001/fscn8001Server.js"
)

# Better: use Python to precisely replace
sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Replace handler -> resolved_by in PATCH block
content = content.replace(
    "if (data.handler) { setParts.push('handler = ?'); params.push(data.handler); }",
    "if (data.handler) { setParts.push('resolved_by = ?'); params.push(data.handler); }"
)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

print('Fixed PATCH API: handler -> resolved_by')

# ===== 2. Fix cameras: change room_id to VARCHAR, insert for roomId=1 =====
sql = """
DROP TABLE IF EXISTS cameras;
CREATE TABLE cameras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(50) DEFAULT '1',
  camera_name VARCHAR(100) NOT NULL,
  camera_no VARCHAR(50),
  position VARCHAR(200),
  status TINYINT DEFAULT 1 COMMENT '1=online, 0=offline',
  stream_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO cameras (room_id, camera_name, camera_no, position, status, stream_url) VALUES
('1', '大厅主摄像头', 'CAM-001', '1F大厅入口', 1, ''),
('1', '配电室摄像头', 'CAM-003', 'B1配电室', 1, '');
"""
stdin, stdout, stderr = client.exec_command(f'mysql -u root -S /tmp/mysql.sock smart_fire -e "{sql}"')
print('Fixed cameras table:', stdout.read().decode() or 'OK')

# Verify
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, room_id, camera_name, status FROM cameras;'")
print('Cameras:')
print(stdout.read().decode())

sftp.close()
client.close()
print('All fixes done')
