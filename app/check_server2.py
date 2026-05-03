import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

stdin, stdout, stderr = client.exec_command('ls -la /opt/my-fire-api/')
print('/opt/my-fire-api/ contents:')
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/package.json')
print('package.json:')
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command('ss -tlnp | grep 5200')
print('Port 5200:')
print(stdout.read().decode() or '(not listening)')

stdin, stdout, stderr = client.exec_command('iptables -L -n | grep 5200 || echo "no iptables rule for 5200"')
print('Firewall:')
print(stdout.read().decode())

client.close()
