import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read current nginx config
stdin, stdout, stderr = client.exec_command("cat /www/server/panel/vhost/nginx/0.default.conf")
content = stdout.read().decode('utf-8', errors='replace')
print('Current config (proxy_pass lines):')
for line in content.split('\n'):
    if 'proxy_pass' in line:
        print(' ', line.strip())

# Replace 3001 with 5003
new_content = content.replace('proxy_pass http://localhost:3001;', 'proxy_pass http://localhost:5003;')
if new_content != content:
    # Write back
    stdin, stdout, stderr = client.exec_command("cat > /www/server/panel/vhost/nginx/0.default.conf << 'EOF'\n" + new_content + "\nEOF")
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if err:
        print('Write error:', err)
    else:
        print('Updated proxy_pass to 5003')
        # Test nginx config
        stdin, stdout, stderr = client.exec_command("nginx -t 2>&1")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        print('nginx -t:', out)
        if err: print('nginx -t err:', err)
        
        # Reload nginx
        if 'successful' in out or 'successful' in err or 'test is successful' in out:
            stdin, stdout, stderr = client.exec_command("nginx -s reload 2>&1")
            out = stdout.read().decode('utf-8', errors='replace').strip()
            err = stderr.read().decode('utf-8', errors='replace').strip()
            print('nginx reload:', out if out else 'OK')
            if err: print('nginx reload err:', err)
else:
    print('No change needed')

# Verify API through nginx
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1/api/units/list?page=1&pageSize=1 2>&1 | head -c 200")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Nginx /api/units/list after fix:', out)

client.close()
