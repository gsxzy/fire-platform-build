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

# Wait for device to reconnect
safe_print('Waiting 10s for device reconnection...')
time.sleep(10)

# Check PM2 status
stdin, stdout, stderr = client.exec_command("/www/server/nodejs/v20.20.0/bin/pm2 describe fire-api 2>&1 | grep -E 'status|uptime|restart'")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('PM2 status:')
safe_print(out)

# Check listening ports
safe_print('\nListening ports:')
stdin, stdout, stderr = client.exec_command("ss -tln | grep -E ':5003|:5004|:5200|:5201'")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check recent gb26875 raw log
safe_print('\nRecent gb26875_raw_log (last 5):')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, cmd_type FROM gb26875_raw_log ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if there are non-01 cmd types today
safe_print('\nToday gb26875 cmd types:')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT cmd_type, COUNT(*) as cnt FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() GROUP BY cmd_type;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fscn8001_alarm today
safe_print('\nToday fscn8001_alarm:')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM fscn8001_alarm WHERE DATE(alarm_time) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fire_alarm today
safe_print('\nToday fire_alarm:')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM fire_alarm WHERE DATE(created_at) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check active connections
safe_print('\nActive TCP connections:')
stdin, stdout, stderr = client.exec_command("ss -tn state established '( sport = 5200 or sport = 5201 )' 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(none)')

client.close()
safe_print('\nDone!')
