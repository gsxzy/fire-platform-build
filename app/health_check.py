import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
login_resp = stdout.read().decode('utf-8', errors='replace')
try:
    token = json.loads(login_resp)['data']['accessToken']
except:
    print('LOGIN FAILED:', login_resp[:200])
    client.close()
    sys.exit(1)

endpoints = [
    ('GET', '/health', None),
    ('GET', '/api/dashboard/stats', None),
    ('GET', '/api/dashboard/unit-rank', None),
    ('GET', '/api/units/list', None),
    ('GET', '/api/devices/list', None),
    ('GET', '/api/devices/status/realtime', None),
    ('GET', '/api/alarms/list', None),
    ('GET', '/api/fire-hosts', None),
    ('GET', '/api/fscn8001/devices', None),
    ('GET', '/api/control-rooms', None),
    ('GET', '/api/users', None),
]

print('=== API Health Check ===')
for method, path, body in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json {('-X ' + method) if method != 'GET' else ''} http://127.0.0.1:5003{path} -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    http_code = stdout.read().decode('utf-8', errors='replace').strip()
    
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json | head -c 150')
    resp = stdout.read().decode('utf-8', errors='replace')
    
    status = 'OK' if http_code == '200' else f'FAIL({http_code})'
    print(f'{status} {method} {path} -> {resp[:100]}')

# Check database tables
print('\n=== Database Tables ===')
stdin, stdout, stderr = client.exec_command("cat /opt/my-fire-api/.env")
env = {}
for line in stdout.read().decode('utf-8', errors='replace').splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k] = v

db_user = env.get('DB_USER', 'root')
db_pass = env.get('DB_PASSWORD', '')
db_host = env.get('DB_HOST', 'localhost')
db_name = env.get('DB_NAME', 'fire_platform')

tables = [
    'users', 'sys_role', 'sys_permission', 'sys_user_role', 'sys_role_permission',
    'fire_host', 'fire_loop', 'fire_device', 'fire_iot_device', 'fire_alarm',
    'devices', 'iot_devices', 'cameras', 'gb28181_devices',
    'fire_building', 'fire_floor', 'fire_floor_device_position',
    'control_room_realtime', 'control_room_command_log',
    'fscn8001_device', 'fscn8001_alarm',
    'linkage_rules', 'linkage_records',
]

cmd = f"mysql -u '{db_user}' -p'{db_pass}' -h '{db_host}' -N -e \"SELECT table_name FROM information_schema.tables WHERE table_schema='{db_name}'\""
stdin, stdout, stderr = client.exec_command(cmd)
existing = set(stdout.read().decode('utf-8', errors='replace').strip().split())

for t in tables:
    status = 'OK' if t in existing else 'MISSING'
    print(f'{status} {t}')

client.close()
