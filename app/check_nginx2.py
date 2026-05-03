import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check nginx config for /api
stdin, stdout, stderr = client.exec_command("grep -n 'proxy_pass' /www/server/panel/vhost/nginx/0.default.conf 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Nginx proxy_pass lines:')
print(out if out else '(none)')

# Check full /api location
stdin, stdout, stderr = client.exec_command("grep -A5 'location /api' /www/server/panel/vhost/nginx/0.default.conf 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('\nNginx /api location:')
print(out if out else '(none)')

# Check if there are other nginx configs with /api
stdin, stdout, stderr = client.exec_command("find /www/server/panel/vhost/nginx/ -name '*.conf' -exec grep -l 'location /api' {} \\; 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('\nFiles with /api location:')
print(out if out else '(none)')

client.close()
