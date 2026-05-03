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

# Test POST login
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"123456\"}' 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('POST /api/auth/login: ' + out)

# Test GET fscn8001 alarms
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/fscn8001/alarms?page=1&pageSize=1 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('GET /api/fscn8001/alarms: ' + out)

# Test GET fscn8001 devices
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/fscn8001/devices?page=1&pageSize=1 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('GET /api/fscn8001/devices: ' + out)

# Check nginx still proxying to 5003
stdin, stdout, stderr = client.exec_command("grep 'proxy_pass' /www/server/panel/vhost/nginx/0.default.conf | grep api")
out = stdout.read().decode('utf-8', errors='replace').strip()
safe_print('Nginx proxy: ' + out)

# Check fscn8001Server error in pm2 log file
stdin, stdout, stderr = client.exec_command("cat /root/.pm2/logs/fire-api-error.log 2>/dev/null | tail -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
if out:
    safe_print('Error logs: ' + out)

stdin, stdout, stderr = client.exec_command("cat /root/.pm2/logs/fire-api-out.log 2>/dev/null | grep -i 'fscn\|alarm\|error' | tail -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
if out:
    safe_print('FSCN logs: ' + out[-500:] if len(out) > 500 else 'FSCN logs: ' + out)

client.close()
safe_print('Done!')
