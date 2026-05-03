import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command('cat /root/fscn8001_capture.py')
content = stdout.read().decode('utf-8', errors='replace')
with open('D:/fscn8001_capture.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('File saved to D:/fscn8001_capture.py')
client.close()
