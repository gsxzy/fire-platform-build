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

# Check latest records in fscn8001 tables
safe_print('=== Latest fscn8001_alarm ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT alarm_time, device_sn, alarm_type, alarm_level FROM fscn8001_alarm ORDER BY alarm_time DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

safe_print('\n=== Latest fscn8001_raw_log ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_sn, cmd_type FROM fscn8001_raw_log ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

safe_print('\n=== Latest gb26875_raw_log ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, cmd_type FROM gb26875_raw_log ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

safe_print('\n=== fire_alarm total ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM fire_alarm;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

safe_print('\n=== fire_alarm latest ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, protocol, alarm_type FROM fire_alarm ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if 5200/5201 are accessible from outside (use a simple nc test from another host - can't do this directly)
# But check if there are any recent connections in netstat
safe_print('\n=== Connection history (last 10 to 5200/5201) ===')
stdin, stdout, stderr = client.exec_command("ss -tn state established '( dport = 5200 or dport = 5201 or sport = 5200 or sport = 5201 )' 2>/dev/null | head -10")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(no established connections)')

# Check PM2 process uptime to see if it was restarted recently
safe_print('\n=== PM2 fire-api uptime ===')
stdin, stdout, stderr = client.exec_command("/www/server/nodejs/v20.20.0/bin/pm2 describe fire-api 2>&1 | grep -E 'uptime|restart|status'")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if fscn8001Server.js DB init succeeded by looking for its specific log pattern
safe_print('\n=== fscn8001Server init log ===')
stdin, stdout, stderr = client.exec_command("grep -i 'FSCN8001.*启动\|MySQL.*入库\|纯日志' /root/.pm2/logs/fire-api-out.log 2>/dev/null | tail -5")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(not found in pm2 logs)')

client.close()
safe_print('\nDone!')
