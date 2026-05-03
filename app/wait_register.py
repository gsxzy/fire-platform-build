import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Wait for device to register
for i in range(12):
    time.sleep(15)
    stdin, stdout, stderr = client.exec_command(
        "redis-cli HGET VMP_DEVICE_INFO '34020000001300000001' 2>/dev/null"
    )
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        online = d.get('onLine')
        keepalive = d.get('keepaliveTime')
        print(f"[{i+1}] online={online}, keepalive={keepalive}")
        if online:
            print("Device is online!")
            break
    except:
        print(f"[{i+1}] No data yet")

client.close()
