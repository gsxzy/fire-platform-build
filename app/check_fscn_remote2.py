import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check PM2 processes for fscn
stdin, stdout, stderr = client.exec_command('pm2 list')
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'w', encoding='utf-8') as f:
    f.write('=== PM2 List ===\n')
    f.write(out)
    f.write('\n')

# Check for fscn8001 files
stdin, stdout, stderr = client.exec_command('find /opt -name "*fscn*" -type f 2>/dev/null | head -20')
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'a', encoding='utf-8') as f:
    f.write('=== FSCN files ===\n')
    f.write(out)
    f.write('\n')

# Check netstat for 5201/5202
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep -E '520[0-9]'")
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'a', encoding='utf-8') as f:
    f.write('=== Ports 520x ===\n')
    f.write(out)
    f.write('\n')

# Check iptables
stdin, stdout, stderr = client.exec_command("iptables -t nat -L PREROUTING -n --line-numbers | grep 520")
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'a', encoding='utf-8') as f:
    f.write('=== iptables 520 rules ===\n')
    f.write(out)
    f.write('\n')

# Check for fscn8001_capture specifically
stdin, stdout, stderr = client.exec_command('find / -name "*fscn8001_capture*" -type f 2>/dev/null | head -10')
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'a', encoding='utf-8') as f:
    f.write('=== fscn8001_capture files ===\n')
    f.write(out)
    f.write('\n')

# Check for any running node processes on 5201
stdin, stdout, stderr = client.exec_command("ps aux | grep fscn | grep -v grep")
out = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn_check.txt', 'a', encoding='utf-8') as f:
    f.write('=== Running fscn processes ===\n')
    f.write(out)
    f.write('\n')

client.close()
print('Results saved to D:/fscn_check.txt')
