import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read unit.js route file
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/routes/unit.js')
content = stdout.read().decode('utf-8', errors='replace')

# Find the create unit (POST) handler
lines = content.split('\n')
in_create = False
for i, line in enumerate(lines):
    if "router.post" in line and "/units" in line:
        in_create = True
    if in_create:
        print(f"{i+1}: {line}")
    if in_create and line.strip() == '});' and 'handleError' not in line:
        # End of handler - check next few lines for catch block
        for j in range(i+1, min(i+10, len(lines))):
            print(f"{j+1}: {lines[j]}")
        break

client.close()
