import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Find nginx config for fire-platform
stdin, stdout, stderr = client.exec_command("find /www/server/panel/vhost/nginx/ -name '*fire*' -type f")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Nginx config files:', out)

# Search proxy_pass in all nginx configs
stdin, stdout, stderr = client.exec_command("grep -rl 'proxy_pass' /www/server/panel/vhost/nginx/ | head -10")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Files with proxy_pass:', out)

# Check which port fire-api actually listens on (exclude MediaServer and java)
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep -v MediaServer | grep -v java")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Other listening ports:', out if out else '(none)')

# Check fire-api env or config for port
stdin, stdout, stderr = client.exec_command("grep -r PORT /opt/my-fire-api/.env /opt/my-fire-api/config/ 2>/dev/null | head -10")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('PORT config:', out if out else '(not found)')

# Check server.js for port
stdin, stdout, stderr = client.exec_command("grep -n 'listen\\|PORT' /opt/my-fire-api/server.js | head -10")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Server.js port:', out if out else '(not found)')

client.close()
