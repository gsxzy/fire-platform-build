import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read current file
stdin, stdout, stderr = client.exec_command('cat /root/fscn8001_capture.py')
content = stdout.read().decode('utf-8', errors='replace')

# Replace port 5201 with 5202
content = content.replace("s.bind(('0.0.0.0', 5201))", "s.bind(('0.0.0.0', 5202))")
content = content.replace("监听端口: 5201", "监听端口: 5202")

# Write back
stdin, stdout, stderr = client.exec_command("cat > /root/fscn8001_capture.py << 'EOF'\n" + content + "\nEOF")

# Verify
stdin, stdout, stderr = client.exec_command("grep -n '5202' /root/fscn8001_capture.py")
with open('D:/capture_verify.txt', 'w', encoding='utf-8') as f:
    f.write(stdout.read().decode('utf-8', errors='replace'))

client.close()
print('Done. Check D:/capture_verify.txt')
