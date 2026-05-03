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

# Check alarm types in fscn8001_alarm on May 1
safe_print('=== fscn8001_alarm types on 2026-05-01 ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT alarm_type, COUNT(*) as cnt FROM fscn8001_alarm WHERE DATE(alarm_time) = '2026-05-01' GROUP BY alarm_type;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fscn8001_raw_log cmd types on May 1
safe_print('\n=== fscn8001_raw_log cmd types on 2026-05-01 ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT cmd_type, COUNT(*) as cnt FROM fscn8001_raw_log WHERE DATE(created_at) = '2026-05-01' GROUP BY cmd_type;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fscn8001_raw_log latest entries on May 1
safe_print('\n=== fscn8001_raw_log latest on 2026-05-01 ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_sn, cmd_type, hex_data FROM fscn8001_raw_log WHERE DATE(created_at) = '2026-05-01' ORDER BY created_at DESC LIMIT 3;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check if fire_alarm has any records at all
safe_print('\n=== fire_alarm all records ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) as cnt FROM fire_alarm;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

# Check fire_alarm structure differences
safe_print('\n=== Compare fire_alarm vs gb26875Server CREATE TABLE ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SHOW CREATE TABLE fire_alarm\\G\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print(out)

client.close()
safe_print('\nDone!')
