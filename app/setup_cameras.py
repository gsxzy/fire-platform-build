import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# 1. Create cameras table
sql = """
CREATE TABLE IF NOT EXISTS cameras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT DEFAULT 0,
  camera_name VARCHAR(100) NOT NULL,
  camera_no VARCHAR(50),
  position VARCHAR(200),
  status TINYINT DEFAULT 1 COMMENT '1=online, 0=offline',
  stream_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""
stdin, stdout, stderr = client.exec_command(f'mysql -u root -S /tmp/mysql.sock smart_fire -e "{sql}"')
print('Create table:', stdout.read().decode() or 'OK')

# 2. Insert demo cameras
sql2 = """
INSERT INTO cameras (room_id, camera_name, camera_no, position, status, stream_url) VALUES
(1, '大厅主摄像头', 'CAM-001', '1F大厅入口', 1, ''),
(1, '走廊东侧摄像头', 'CAM-002', '1F走廊东侧', 1, ''),
(1, '配电室摄像头', 'CAM-003', 'B1配电室', 1, ''),
(1, '停车场A区', 'CAM-004', 'B2停车场A区', 0, ''),
(1, '楼顶机房', 'CAM-005', '屋顶机房', 1, '');
"""
stdin, stdout, stderr = client.exec_command(f'mysql -u root -S /tmp/mysql.sock smart_fire -e "{sql2}"')
print('Insert data:', stdout.read().decode() or 'OK')

# 3. Verify
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, camera_name, status FROM cameras;'")
print('Cameras:')
print(stdout.read().decode())

client.close()
print('Done')
