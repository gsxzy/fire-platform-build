import paramiko, json
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

cmds = [
    'mysql -u root -pZhangcong2255 fire_platform -e "SELECT id, name FROM units" 2>&1',
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print('=== ' + cmd + ' ===')
    print(out if out else '(empty)')
    print()

stdin, stdout, stderr = client.exec_command(
    "curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = stdout.read().decode('utf-8', errors='replace').strip()
try:
    token = json.loads(login_res)['data']['token']
except:
    token = ''
print('Token: ' + (token[:40] if token else 'FAILED'))
print()

if token:
    stdin, stdout, stderr = client.exec_command(
        "curl -s http://127.0.0.1:5003/api/units -H 'Authorization: Bearer " + token + "' | head -c 200"
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print('=== /api/units ===')
    print(out)
    print()

client.close()
