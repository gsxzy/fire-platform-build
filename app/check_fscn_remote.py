import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check PM2 processes for fscn
stdin, stdout, stderr = client.exec_command('pm2 list')
print('=== PM2 List ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check for fscn8001 files
stdin, stdout, stderr = client.exec_command('find /opt -name "*fscn*" -type f 2>/dev/null | head -20')
print('\n=== FSCN files ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check netstat for 5201/5202
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep -E '520[0-9]'")
print('\n=== Ports 520x ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check iptables
stdin, stdout, stderr = client.exec_command("iptables -t nat -L PREROUTING -n --line-numbers | grep 520")
print('\n=== iptables 520 rules ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check for fscn8001_capture specifically
stdin, stdout, stderr = client.exec_command('find / -name "*fscn8001_capture*" -type f 2>/dev/null | head -10')
print('\n=== fscn8001_capture files ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
