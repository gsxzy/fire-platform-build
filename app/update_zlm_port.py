import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

sql = "UPDATE wvp_media_server SET rtp_port_range='30000,30500' WHERE id='zlm-local';"
stdin, stdout, stderr = client.exec_command(f"cat > /tmp/u.sql << 'EOF'\n{sql}\nEOF")
stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/u.sql 2>&1"
)
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SELECT id, rtp_port_range FROM wvp_media_server;' wvp 2>&1"
)
print("Verify:", stdout.read().decode('utf-8', errors='replace'))

client.close()
