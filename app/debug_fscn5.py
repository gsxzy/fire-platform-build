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

# Get a few recent raw log entries with hex data
safe_print('=== Recent gb26875 raw log (today) ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, cmd_type, hex_data FROM gb26875_raw_log WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Get a few recent fscn8001 raw log entries (for comparison)
safe_print('\n=== Recent fscn8001 raw log (all time) ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_sn, cmd_type, hex_data FROM fscn8001_raw_log ORDER BY created_at DESC LIMIT 5;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check PM2 logs for connection/disconnection events
safe_print('\n=== PM2 out logs (connection related) ===')
stdin, stdout, stderr = client.exec_command("grep -E 'CONN|RX|TX|WARN|ERROR' /root/.pm2/logs/fire-api-out.log 2>/dev/null | tail -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out[-600:] if len(out) > 600 else out)

# Check if there are TCP disconnections
safe_print('\n=== ss state for 5200 ===')
stdin, stdout, stderr = client.exec_command("ss -tn state all '( sport = 5200 )' | head -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out if out else '(none)')

client.close()
safe_print('\nDone!')
