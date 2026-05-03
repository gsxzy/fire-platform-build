import paramiko, os
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

sftp = client.open_sftp()

def upload_dir(local_dir, remote_dir):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            try:
                sftp.mkdir(remote_path)
            except:
                pass
            upload_dir(local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f'  {remote_path}')

print('Uploading dist/ to /www/wwwroot/fire-platform/ ...')
upload_dir(r'D:\新致远智慧消防平台\fire-platform-build\app\dist', '/www/wwwroot/fire-platform')

sftp.close()
client.close()
print('Done')
