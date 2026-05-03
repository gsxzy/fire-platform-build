import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# Update stream_url for both cameras
cmd = "UPDATE cameras SET stream_url = 'https://sf1-hls-cdn-tos.bytegeek.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8' WHERE id IN (1, 2)"
stdin, stdout, stderr = client.exec_command(f"mysql -u root -S /tmp/mysql.sock smart_fire -e '{cmd}'")
print('Update result:', stdout.read().decode() or 'OK')

# Verify
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, camera_name, stream_url FROM cameras;'")
print('Cameras:')
print(stdout.read().decode())

client.close()
