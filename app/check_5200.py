import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check 5200 port connections
stdin, stdout, stderr = client.exec_command('ss -tnp | grep 5200')
out = stdout.read().decode('utf-8', errors='replace')
with open('5200_status.txt', 'w', encoding='utf-8') as f:
    f.write('=== 5200 Port Connections ===\n')
    f.write(out if out else '(no active connections)\n')

# Check latest GB26875 logs
stdin, stdout, stderr = client.exec_command('tail -n 50 /opt/my-fire-api/logs/out.log | grep -E "GB26875|CONN|RX|HANDLER"')
out = stdout.read().decode('utf-8', errors='replace')
with open('5200_status.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== Recent GB26875 Logs ===\n')
    f.write(out if out else '(no GB26875 logs)\n')

# Check raw log count
stdin, stdout, stderr = client.exec_command('mysql -e "SELECT COUNT(*) FROM fire_platform.gb26875_raw_log;" 2>/dev/null || echo "mysql command failed"')
out = stdout.read().decode('utf-8', errors='replace')
with open('5200_status.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== Raw Log Count ===\n')
    f.write(out)

# Check device count
stdin, stdout, stderr = client.exec_command('mysql -e "SELECT device_id, status, last_heartbeat FROM fire_platform.gb26875_device;" 2>/dev/null || echo "mysql command failed"')
out = stdout.read().decode('utf-8', errors='replace')
with open('5200_status.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== GB26875 Devices ===\n')
    f.write(out)

# Check alarm count
stdin, stdout, stderr = client.exec_command('mysql -e "SELECT COUNT(*) FROM fire_platform.gb26875_alarm;" 2>/dev/null || echo "mysql command failed"')
out = stdout.read().decode('utf-8', errors='replace')
with open('5200_status.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== Alarm Count ===\n')
    f.write(out)

client.close()
print('done')
