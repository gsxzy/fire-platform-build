import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check if wvp db exists in host MySQL
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 -e 'SHOW DATABASES;' 2>/dev/null | grep -i wvp || echo 'no wvp db'")
print('Host MySQL wvp db:', stdout.read().decode('utf-8', errors='replace').strip())

# Check docker pull progress
stdin, stdout, stderr = client.exec_command("docker images | grep mysql || echo 'no mysql image'")
print('Docker images:', stdout.read().decode('utf-8', errors='replace').strip())

# Check if wvp-mysql container exists
stdin, stdout, stderr = client.exec_command("docker ps -a | grep wvp-mysql || echo 'no wvp-mysql container'")
print('WVP mysql container:', stdout.read().decode('utf-8', errors='replace').strip())

client.close()
