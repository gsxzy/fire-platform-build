import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

pw = 'Xzy@2025'

cmds = [
    ("SHOW TABLES like 'control_room%'", f"mysql -u root -p'{pw}' -D fire_platform -e \"SHOW TABLES LIKE 'control_room%';\""),
    ("control_rooms count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) FROM control_rooms;'"),
    ("control_room_realtime count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) FROM control_room_realtime;'"),
    ("fire_host count", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT COUNT(*) FROM fire_host;'"),
    ("control_room_realtime full", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT room_id, host_id, fire_count, fault_count, host_status FROM control_room_realtime;'"),
    ("fire_host full", f"mysql -u root -p'{pw}' -D fire_platform -e 'SELECT id, host_code, brand, model, location FROM fire_host;'"),
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
