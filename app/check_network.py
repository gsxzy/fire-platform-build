import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check iptables
stdin, stdout, stderr = client.exec_command('iptables -L INPUT -n --line-numbers | grep 5200')
out = stdout.read().decode('utf-8', errors='replace')
with open('network_check.txt', 'w', encoding='utf-8') as f:
    f.write('=== iptables rules for 5200 ===\n')
    f.write(out if out else '(no rules)\n')

# Check firewalld
stdin, stdout, stderr = client.exec_command('firewall-cmd --list-ports 2>/dev/null || echo "firewalld not active"')
out = stdout.read().decode('utf-8', errors='replace')
with open('network_check.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== firewalld ports ===\n')
    f.write(out)

# Check ufw
stdin, stdout, stderr = client.exec_command('ufw status 2>/dev/null || echo "ufw not active"')
out = stdout.read().decode('utf-8', errors='replace')
with open('network_check.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== ufw status ===\n')
    f.write(out)

# Check all listening ports
stdin, stdout, stderr = client.exec_command('ss -tlnp')
out = stdout.read().decode('utf-8', errors='replace')
with open('network_check.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== All listening ports ===\n')
    f.write(out)

# Check server public IP
stdin, stdout, stderr = client.exec_command('curl -s ifconfig.me || echo "curl failed"')
out = stdout.read().decode('utf-8', errors='replace')
with open('network_check.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== Public IP ===\n')
    f.write(out)

client.close()
print('done')
