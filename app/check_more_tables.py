import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

for tbl in ['multiline_panel', 'bus_panel', 'control_room_config', 'alarm_snapshot', 'units']:
    stdin, stdout, stderr = ssh.exec_command(f"mysql -u root -e \"DESCRIBE fire_platform.{tbl};\" 2>&1")
    out = stdout.read().decode('utf-8', errors='replace')
    print(f'=== {tbl} ===')
    print(out if 'Field' in out else f'(table not found or error: {out.strip()})')
    print()

ssh.close()
