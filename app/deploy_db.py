import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')
sftp = ssh.open_sftp()

print('Uploading SQL files...')
sftp.put('sql/fire_host.sql', '/tmp/fire_host.sql')
sftp.put('sql/fire_control_expand.sql', '/tmp/fire_control_expand.sql')
sftp.put('sql/control_room_backend.sql', '/tmp/control_room_backend.sql')

for sql_file in ['/tmp/fire_host.sql', '/tmp/fire_control_expand.sql', '/tmp/control_room_backend.sql']:
    print(f'Executing {sql_file}...')
    cmd = f'mysql -uroot fire_platform < {sql_file} 2>&1'
    _, o, e = ssh.exec_command(cmd)
    out = o.read().decode('utf-8', 'ignore')
    err = e.read().decode('utf-8', 'ignore')
    if out.strip(): print('OUT:', out[:500])
    if err.strip(): print('ERR:', err[:500])

print('Verifying tables...')
_, o, _ = ssh.exec_command("mysql -uroot -e 'SHOW TABLES FROM fire_platform;'")
print(o.read().decode('utf-8', 'ignore'))

sftp.close()
ssh.close()
print('Done!')
