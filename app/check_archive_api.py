import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

output_lines = []

# Check devices API
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/devices?page=1&pageSize=5")
output_lines.append('=== GET /api/devices ===')
output_lines.append(stdout.read().decode('utf-8', errors='replace'))

# Check iot-devices API
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/iot-devices?page=1&pageSize=5")
output_lines.append('=== GET /api/iot-devices ===')
output_lines.append(stdout.read().decode('utf-8', errors='replace'))

# Check cameras API
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/cameras?page=1&pageSize=5")
output_lines.append('=== GET /api/cameras ===')
output_lines.append(stdout.read().decode('utf-8', errors='replace'))

# Check gb28181-devices API
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/gb28181-devices?page=1&pageSize=5")
output_lines.append('=== GET /api/gb28181-devices ===')
output_lines.append(stdout.read().decode('utf-8', errors='replace'))

client.close()

with open('archive_api_check.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))
print('Archive API check written to archive_api_check.txt')
