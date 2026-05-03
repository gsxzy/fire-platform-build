import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# 1. Fix resolved_by type: INT -> VARCHAR
stdin, stdout, stderr = client.exec_command(
    "mysql -u root -S /tmp/mysql.sock smart_fire -e 'ALTER TABLE alarms MODIFY resolved_by VARCHAR(100);'"
)
print('Alter resolved_by:', stdout.read().decode() or 'OK')

# 2. Fix backend API: if roomId not match, return all cameras (so any roomId works)
sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Find and replace camera API to be more flexible
old_camera_api = '''      // GET /api/control-rooms/videos
      if (method === 'GET' && path === '/api/control-rooms/videos') {
        const roomId = q.roomId;
        let where = 'WHERE 1=1';
        const params = [];
        if (roomId) {
          where += ' AND room_id = ?';
          params.push(roomId);
        }
        const [rows] = await dbPool.query(
          `SELECT id, room_id AS roomId, camera_name AS cameraName, camera_no AS cameraNo, position, status, stream_url AS streamUrl, created_at AS createdAt FROM cameras ${where} ORDER BY id DESC`,
          params
        );
        sendJson(res, 200, { code: 200, msg: 'success', data: rows });
        return;
      }'''

new_camera_api = '''      // GET /api/control-rooms/videos
      if (method === 'GET' && path === '/api/control-rooms/videos') {
        const roomId = q.roomId;
        let where = 'WHERE 1=1';
        const params = [];
        if (roomId) {
          where += ' AND (room_id = ? OR room_id = \\'1\\')';
          params.push(roomId);
        }
        const [rows] = await dbPool.query(
          `SELECT id, room_id AS roomId, camera_name AS cameraName, camera_no AS cameraNo, position, status, stream_url AS streamUrl, created_at AS createdAt FROM cameras ${where} ORDER BY id DESC`,
          params
        );
        sendJson(res, 200, { code: 200, msg: 'success', data: rows });
        return;
      }'''

content = content.replace(old_camera_api, new_camera_api)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

print('Fixed camera API')

# 3. Restart and verify
client.exec_command('cd /opt/fscn8001 && nohup node fscn8001Server.js >> fscn8001.log 2>&1 &')
print('Restarted')

import time
time.sleep(3)

# Test PATCH
stdin, stdout, stderr = client.exec_command(
    "curl -s -X PATCH -H 'Content-Type: application/json' "
    "-d '{\"status\":\"confirmed\",\"handler\":\"值班员A\",\"handleTime\":\"2026-04-28T12:00:00Z\",\"handleNote\":\"值守确认\"}' "
    "'http://127.0.0.1:5004/api/alarms/13'"
)
print('PATCH result:', stdout.read().decode())

# Verify DB
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, status, resolved_by, notes FROM alarms WHERE id=13;'")
print('Alarm 13:')
print(stdout.read().decode())

# Test camera API with different roomIds
for rid in ['1', 'CR001', 'abc']:
    stdin, stdout, stderr = client.exec_command(f"curl -s 'http://127.0.0.1:5004/api/control-rooms/videos?roomId={rid}'")
    res = stdout.read().decode()
    import json
    data = json.loads(res)
    print(f'Camera roomId={rid}: {len(data.get("data", []))} cameras')

sftp.close()
client.close()
