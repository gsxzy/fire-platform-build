import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = client.exec_command("ls -la /tmp/mysql.sock 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Socket file:', out)

stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 -e 'SELECT 1' 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('MySQL CLI test:', out)

client.close()
