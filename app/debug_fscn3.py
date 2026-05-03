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

# Check gb26875_alarm today
safe_print('=== gb26875_alarm today ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, alarm_type, alarm_level, location FROM gb26875_alarm WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 10;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check gb26875_device status
safe_print('\n=== gb26875_device ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT device_id, ip, status, last_heartbeat FROM gb26875_device ORDER BY last_heartbeat DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fscn8001_device status
safe_print('\n=== fscn8001_device ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT device_sn, ip, status, last_heartbeat FROM fscn8001_device ORDER BY last_heartbeat DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check why fire_alarm is empty - look at gb26875Server handlers for alarm
safe_print('\n=== gb26875 raw log today count by type ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT cmd_type, COUNT(*) as cnt FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() GROUP BY cmd_type;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check total gb26875 alarm
safe_print('\n=== Total gb26875_alarm ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM gb26875_alarm;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fire_alarm table structure to see if there's an issue
safe_print('\n=== fire_alarm structure ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SHOW COLUMNS FROM fire_alarm;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if there's any error in gb26875Server alarm creation
safe_print('\n=== Check gb26875Server for createAlarm call ===')
stdin, stdout, stderr = client.exec_command("grep -n 'createAlarm' /opt/my-fire-api/gb26875Server.js | head -5")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

client.close()
safe_print('\nDone!')
