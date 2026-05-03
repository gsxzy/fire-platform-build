import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

pw = 'Xzy@2025'

# 1. Get a valid token by logging in
stdin, stdout, stderr = ssh.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
login_resp = stdout.read().decode()
print('Login:', login_resp[:200])

import json
try:
    token = json.loads(login_resp).get('data', {}).get('token', '')
    print('Token:', token[:50] if token else 'None')
except:
    token = ''

if token:
    # 2. Test cameras list with valid token
    stdin, stdout, stderr = ssh.exec_command(f"curl -s http://127.0.0.1:5003/api/cameras -H 'Authorization: Bearer {token}'")
    print('Cameras:', stdout.read().decode()[:500])

    # 3. Test delete CAM-003 (safe test - CAM-003 only in CR-002)
    stdin, stdout, stderr = ssh.exec_command(f"curl -s -X DELETE http://127.0.0.1:5003/api/cameras/CAM-003 -H 'Authorization: Bearer {token}'")
    del_resp = stdout.read().decode()
    print('Delete CAM-003:', del_resp)

    # 4. Verify cameras table
    stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id FROM cameras;'")
    print('Cameras after delete:', stdout.read().decode())

    # 5. Verify control_room_video
    stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT camera_no, room_id FROM control_room_video;'")
    print('control_room_video after delete:')
    print(stdout.read().decode())
else:
    print('No token available')

ssh.close()
