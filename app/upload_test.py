import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()
sftp.put('test_alarm.js', '/opt/my-fire-api/test_alarm.js')
sftp.close()
stdin, stdout, stderr = client.exec_command("cd /opt/my-fire-api && node test_alarm.js 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('OUT:', out)
if err: print('ERR:', err)
client.close()
