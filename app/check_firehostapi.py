import paramiko, re
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/fireHostApi.js')
content = stdout.read().decode('utf-8', errors='replace')

# Extract all router.get/post/put/delete lines
print('=== fireHostApi.js routes ===')
for line in content.split('\n'):
    line = line.strip()
    if re.match(r"router\.(get|post|put|patch|delete)\s*\(", line):
        print(line[:120])

client.close()
