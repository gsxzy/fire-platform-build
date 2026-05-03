import paramiko, json
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check wvp_user table
stdin, stdout, stderr = client.exec_command("docker exec wvp-mysql mysql -uroot -pwvp@2024 -e 'SELECT id, username, password, role_id FROM wvp_user;' wvp 2>/dev/null")
print('wvp_user table:')
print(stdout.read().decode('utf-8', errors='replace').strip())

# Test common passwords
passwords = ['admin', '123456', '12345678', 'admin123', 'wvp@2024', 'root', 'Admin@123', '21232f297a57a5a743894a0e4a801fc3']
print('\nPassword tests:')
for p in passwords:
    cmd = f"curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password={p}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    resp = stdout.read().decode('utf-8', errors='replace').strip()
    try:
        d = json.loads(resp)
        code = d.get('code')
        msg = d.get('msg', '')
    except:
        code = '?'
        msg = resp[:50]
    print(f'  pass={p}: code={code} msg={msg}')

client.close()
