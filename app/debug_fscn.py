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

# 1. Check if 5201 is accessible from outside
safe_print('=== 1. 5201 port firewall check ===')
stdin, stdout, stderr = client.exec_command("iptables -L -n | grep 5201; echo '---'; ufw status | grep 5201; echo '---'; firewall-cmd --list-ports 2>/dev/null | grep 5201")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(no firewall rules for 5201)')

# Check cloud security group (can't directly check, but check if 5201 is in LISTEN state with 0.0.0.0)
stdin, stdout, stderr = client.exec_command("ss -tln | grep 5201")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('Listen state: ' + (out if out else 'NOT FOUND'))

# 2. Check today's fscn8001 data in database
safe_print('\n=== 2. Database today data ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as today_alarms FROM fscn8001_alarm WHERE DATE(alarm_time) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as today_raw FROM fscn8001_raw_log WHERE DATE(created_at) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as today_fire_alarm FROM fire_alarm WHERE DATE(created_at) = CURDATE() AND protocol='fscn8001';\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# 3. Check fscn8001Server.js DB connection status in logs
safe_print('\n=== 3. PM2 logs (FSCN8001 related) ===')
stdin, stdout, stderr = client.exec_command("cat /root/.pm2/logs/fire-api-out.log 2>/dev/null | grep -i 'FSCN8001\|fscn\|DB\|MySQL' | tail -30")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out[-800:] if len(out) > 800 else out)

# 4. Check error logs
safe_print('\n=== 4. PM2 error logs ===')
stdin, stdout, stderr = client.exec_command("cat /root/.pm2/logs/fire-api-error.log 2>/dev/null | tail -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(empty)')

# 5. Check recent connections to 5201
safe_print('\n=== 5. Recent TCP connections to 5201 ===')
stdin, stdout, stderr = client.exec_command("ss -tn | grep 5201 | head -10")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(no active connections)')

# 6. Check total fscn8001 records
safe_print('\n=== 6. Total FSCN8001 records ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT 'fscn8001_alarm' as tbl, COUNT(*) as cnt FROM fscn8001_alarm UNION ALL SELECT 'fscn8001_device', COUNT(*) FROM fscn8001_device UNION ALL SELECT 'fscn8001_raw_log', COUNT(*) FROM fscn8001_raw_log UNION ALL SELECT 'fire_alarm', COUNT(*) FROM fire_alarm WHERE protocol='fscn8001';\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# 7. Check today's alarms table data
safe_print('\n=== 7. Today alarms table ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as today_alarms FROM alarms WHERE DATE(start_time) = CURDATE();\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

client.close()
safe_print('\nDone!')
