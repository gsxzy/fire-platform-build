import paramiko, time
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('gbk', 'ignore').decode('gbk'))

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

# Restart PM2
safe_print('[1/5] Restarting PM2 fire-api...')
out, err = run('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
safe_print(out if out else '(no output)')
if err: safe_print('ERR: ' + err)

# Wait for startup
safe_print('\n[2/5] Waiting 5s for startup...')
time.sleep(5)

# Check PM2 status
safe_print('\n[3/5] PM2 status:')
out, err = run('/www/server/nodejs/v20.20.0/bin/pm2 describe fire-api 2>&1 | grep -E "status|pid|name"')
safe_print(out if out else '(no info)')

# Check listening ports
safe_print('\n[4/5] Listening ports:')
out, err = run("ss -tlnp | grep -E ':5003|:5200|:5201'")
safe_print(out if out else '(none)')

# Check API health
safe_print('\n[5/5] API health checks:')
for path in ['/api/auth/login', '/api/units/list', '/api/alarms']:
    out, err = run(f"curl -s -o /dev/null -w '%{{http_code}}' 'http://127.0.0.1:5003{path}?page=1&pageSize=1' 2>&1")
    safe_print(f'  {path}: {out}')

# Check fscn8001 tables
safe_print('\n[Extra] FSCN8001 tables:')
out, err = run("mysql -u root -pZhangcong2255 fire_platform -e \"SHOW TABLES LIKE 'fscn8001%';\" 2>&1")
safe_print(out if out else '(no tables)')

safe_print('\n[Extra] alarms table:')
out, err = run("mysql -u root -pZhangcong2255 fire_platform -e \"SHOW TABLES LIKE 'alarms';\" 2>&1")
safe_print(out if out else '(no table)')

client.close()
safe_print('\nDone!')
