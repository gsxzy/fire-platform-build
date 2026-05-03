import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# List files in backend dir
stdin, stdout, stderr = client.exec_command('ls -la /opt/my-fire-api/')
print('=== /opt/my-fire-api/ ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Find the main entry file
stdin, stdout, stderr = client.exec_command('find /opt/my-fire-api/ -maxdepth 1 -name "*.js" | head -20')
print('\n=== JS files ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check package.json for main entry
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/package.json')
print('\n=== package.json ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
