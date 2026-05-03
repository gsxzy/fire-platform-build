import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

sql = """UPDATE wvp_device_channel SET gb_device_id = '34020000001320000001' WHERE device_id = '34020000001300000001';
UPDATE wvp_device_channel SET gb_device_id = '34020000001320000002' WHERE device_id = '34020000001320000002';
"""

stdin, stdout, stderr = client.exec_command("cat > /tmp/u.sql << 'EOF'\n" + sql + "EOF")
print("Write:", stdout.channel.recv_exit_status())

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/u.sql 2>&1"
)
print("Result:", stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SELECT device_id, name, gb_device_id FROM wvp_device_channel;' wvp 2>&1"
)
print("Verify:")
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
