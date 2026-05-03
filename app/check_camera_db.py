import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

pw = 'Xzy@2025'

cmds = [
    ("cameras count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) as count FROM cameras;'"),
    ("cameras all", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id, name, type, status FROM cameras;'"),
    ("control_room_video count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) as count FROM control_room_video;'"),
    ("control_room_video all", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id, camera_name, camera_no, room_id FROM control_room_video;'"),
    ("devices count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) as count FROM devices;'"),
    ("devices camera-like", f"mysql -u root -p'{pw}' -D fire_platform -e \"SELECT id, name, type FROM devices WHERE type IN ('camera','gb28181-camera');\""),
]

for title, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(f'=== {title} ===')
    print(out)
    if err.strip() and 'Warning' not in err:
        print('ERR:', err)
    print()

ssh.close()
