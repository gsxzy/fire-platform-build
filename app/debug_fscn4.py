import paramiko
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

# Check today's gb26875 raw log detail
safe_print('=== Today gb26875 raw log (distinct cmd_types) ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT cmd_type, COUNT(*) as cnt, MIN(created_at) as first, MAX(created_at) as last FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() GROUP BY cmd_type;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if there are any non-01 commands today
safe_print('\n=== Today gb26875 raw log non-01 ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, cmd_type, hex_data FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() AND cmd_type != '01' ORDER BY created_at DESC LIMIT 10;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(none)')

# Check login frequency today (per minute)
safe_print('\n=== Login frequency today (last 10 minutes) ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT DATE_FORMAT(created_at, '%H:%i') as minute, COUNT(*) as cnt FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() AND cmd_type='01' GROUP BY minute ORDER BY minute DESC LIMIT 10;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fscn8001_raw_log for any data today
safe_print('\n=== fscn8001_raw_log today ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM fscn8001_raw_log WHERE DATE(created_at) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check what pages query fscn8001_alarm vs gb26875_alarm
safe_print('\n=== Frontend alarm query sources ===')
stdin, stdout, stderr = client.exec_command("grep -rl 'fscn8001_alarm\|gb26875_alarm' /opt/my-fire-api/ 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(none)')

client.close()
safe_print('\nDone!')
