import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()
with sftp.file('/opt/fscn8001/fscn8001Server.js', 'r') as f:
    content = f.read().decode('utf-8')

# Add /api/control-rooms/videos API before the devices/list block
camera_api = '''      // GET /api/control-rooms/videos
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
      }

'''

# Insert before GET /api/devices/list
old = '      // GET /api/devices/list'
content = content.replace(old, camera_api + old)

with sftp.file('/opt/fscn8001/fscn8001Server.js', 'w') as f:
    f.write(content.encode('utf-8'))

sftp.close()
client.close()
print('Camera API added')
