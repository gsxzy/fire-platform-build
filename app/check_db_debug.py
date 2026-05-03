import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

mysql_cmd = 'mysql -uroot fire_platform -e'

_, out, err = ssh.exec_command(f'{mysql_cmd} \"SELECT COUNT(*) FROM fire_host;\"')
result = out.read().decode('utf-8', errors='replace')
error = err.read().decode('utf-8', errors='replace')
print('RAW OUT:', repr(result))
print('RAW ERR:', repr(error))

ssh.close()
