import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# Check current data
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT * FROM cameras\\G'")
print('Cameras detail:')
print(stdout.read().decode())

# Try update with SET NAMES
sql = "SET NAMES utf8mb4; UPDATE cameras SET stream_url = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' WHERE id = 1; UPDATE cameras SET stream_url = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' WHERE id = 2;"
stdin, stdout, stderr = client.exec_command(f'mysql -u root -S /tmp/mysql.sock smart_fire -e "{sql}"')
out = stdout.read().decode()
err = stderr.read().decode()
print('Update out:', out)
print('Update err:', err)

# Verify again
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, stream_url FROM cameras;'")
print('After update:')
print(stdout.read().decode())

client.close()
