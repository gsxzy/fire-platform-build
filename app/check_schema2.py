import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/.env')
env = {}
for line in stdout.read().decode('utf-8', errors='replace').splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k] = v

db_user = env.get('DB_USER', 'root')
db_pass = env.get('DB_PASSWORD', '')
db_host = env.get('DB_HOST', 'localhost')
db_name = env.get('DB_NAME', 'fire_platform')

for table in ['units', 'fire_building']:
    cmd = f"mysql -u '{db_user}' -p'{db_pass}' -h '{db_host}' -N -e \"SHOW COLUMNS FROM {table}\" {db_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f'=== {table} columns ===')
    print(stdout.read().decode('utf-8', errors='replace'))

# Directly run the failing SQL to see exact error
cmd = f"mysql -u '{db_user}' -p'{db_pass}' -h '{db_host}' -e \"SELECT da.id, da.code, da.name, da.category, da.status, da.health_score, da.protocol_type, da.unit_id, u.name as unit_name, da.building_id, fb.name as building_name, da.protocol_device_id, fid.last_heartbeat as last_online, fid.online_status as real_time_status FROM device_archive da LEFT JOIN units u ON da.unit_id = u.id LEFT JOIN fire_building fb ON da.building_id = fb.id LEFT JOIN fire_iot_device fid ON da.protocol_device_id = fid.device_id ORDER BY da.updated_at DESC LIMIT 1\" {db_name}"
stdin, stdout, stderr = client.exec_command(cmd)
print('=== SQL Error ===')
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
