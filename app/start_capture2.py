import paramiko, time
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Kill old
client.exec_command("pkill -f 'fscn8001_capture.py' 2>/dev/null; true")
time.sleep(1)

# Start new with setsid
client.exec_command("setsid python3 /root/fscn8001_capture.py > /root/fscn8001_capture.log 2>&1 &")
time.sleep(2)

# Check process
stdin, stdout, stderr = client.exec_command("ps aux | grep fscn8001_capture | grep -v grep")
proc = stdout.read().decode('utf-8', errors='replace').strip()

# Check port
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep ':5202'")
port = stdout.read().decode('utf-8', errors='replace').strip()

# Check log
stdin, stdout, stderr = client.exec_command("tail -n 10 /root/fscn8001_capture.log")
log = stdout.read().decode('utf-8', errors='replace').strip()

with open('D:/capture_start2.txt', 'w', encoding='utf-8') as f:
    f.write('=== Process ===\n' + proc + '\n\n')
    f.write('=== Port 5202 ===\n' + port + '\n\n')
    f.write('=== Log tail ===\n' + log + '\n')

client.close()
print('Done')
