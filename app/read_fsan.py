import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Read the fsan server file
stdin, stdout, stderr = client.exec_command('cat /opt/fsan/fscn8001.js')
content = stdout.read().decode('utf-8', errors='replace')

client.close()

with open('fscn8001_server_src.js', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Read {len(content)} bytes from /opt/fsan/fscn8001.js')
