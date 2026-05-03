import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'DESC wvp_device_channel;' wvp 2>&1"
)
print("Schema:")
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SELECT * FROM wvp_device_channel WHERE device_id=\\\"34020000001300000001\\\";' wvp 2>&1"
)
print("\nData:")
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
