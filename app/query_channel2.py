import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Create a SQL file and execute it
sql_content = """SELECT device_id, name, status, gb_device_id, stream_id FROM wvp_device_channel WHERE device_id = '34020000001300000001';
"""

stdin, stdout, stderr = client.exec_command("cat > /tmp/q.sql << 'EOF'\n" + sql_content + "EOF")
print("Write:", stdout.channel.recv_exit_status())

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/q.sql 2>&1"
)
print("Result:")
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
