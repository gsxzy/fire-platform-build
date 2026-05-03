import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read wvp.service.js
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/services/wvp.service.js')
content = stdout.read().decode('utf-8', errors='replace')

# Replace password default
old = "password: WVP_SECRET || 'admin'"
new = "password: WVP_SECRET || '21232f297a57a5a743894a0e4a801fc3'"
if old in content:
    content = content.replace(old, new)
    stdin, stdout, stderr = client.exec_command("cat > /opt/my-fire-api/services/wvp.service.js << 'EOF'\n" + content + "\nEOF")
    print('Updated wvp.service.js password')
else:
    print('Old password string not found')

# Upload updated stub.js
with open('D:/新致远智慧消防平台/fire-platform-build/app/backend/routes/stub.js', 'r', encoding='utf-8') as f:
    stub_content = f.read()

stdin, stdout, stderr = client.exec_command("cat > /opt/my-fire-api/routes/stub.js << 'EOF'\n" + stub_content + "\nEOF")
print('Uploaded stub.js')

# Restart fire-api
run("pm2 restart fire-api", "restart fire-api")

client.close()
