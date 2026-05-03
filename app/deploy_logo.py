import paramiko, os
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()

# Upload logo.png to nginx static dir
local_logo = r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png'
remote_logo = '/www/wwwroot/fire-platform/logo.png'
sftp.put(local_logo, remote_logo)
print(f'Uploaded logo.png to {remote_logo}')

# Also upload to public dir for consistency
sftp.put(local_logo, '/www/wwwroot/fire-platform/logo.png')

# Verify
stdin, stdout, stderr = client.exec_command('ls -la /www/wwwroot/fire-platform/logo.png')
print(stdout.read().decode())

sftp.close()
client.close()
print('Done')
