import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# 1. Kill any existing fscn8001_capture processes
stdin, stdout, stderr = client.exec_command("pkill -f 'fscn8001_capture.py' || true")
stdout.read()

# 2. Check if port 5202 is available
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep ':5202' || echo 'Port 5202 is free'")
port_check = stdout.read().decode('utf-8', errors='replace').strip()

# 3. Start the capture service in background using nohup
stdin, stdout, stderr = client.exec_command(
    "cd /root && nohup python3 fscn8001_capture.py > /root/fscn8001_capture.log 2>&1 &"
)
stdout.read()

# 4. Wait a moment and check process
import time
time.sleep(2)

stdin, stdout, stderr = client.exec_command("ps aux | grep fscn8001_capture | grep -v grep")
proc = stdout.read().decode('utf-8', errors='replace').strip()

stdin, stdout, stderr = client.exec_command("ss -tlnp | grep ':5202'")
listen = stdout.read().decode('utf-8', errors='replace').strip()

with open('D:/capture_start.txt', 'w', encoding='utf-8') as f:
    f.write('=== Port Check ===\n')
    f.write(port_check + '\n\n')
    f.write('=== Process ===\n')
    f.write(proc + '\n\n')
    f.write('=== Listening ===\n')
    f.write(listen + '\n')

client.close()
print('Done. Check D:/capture_start.txt')
