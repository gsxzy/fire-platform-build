import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

mysql_cmd = 'mysql -uroot fire_platform -e'

tables = ['fire_host', 'fire_loop', 'fire_device', 'users']
for tbl in tables:
    cmd = f'{mysql_cmd} \"SELECT COUNT(*) FROM \\\"{tbl}\\\";\"'
    print('CMD:', cmd)
    _, out, err = ssh.exec_command(cmd)
    result = out.read().decode('utf-8', errors='replace')
    error = err.read().decode('utf-8', errors='replace')
    print('RAW OUT:', repr(result))
    print('RAW ERR:', repr(error))
    lines = [l.strip() for l in result.splitlines() if l.strip()]
    print('LINES:', lines)
    print('---')

ssh.close()
