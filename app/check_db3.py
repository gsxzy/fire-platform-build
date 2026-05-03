import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Latest 5 raw logs
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT id, device_id, cmd, HEX(raw_data) as hex_data, created_at FROM fire_platform.gb26875_raw_log ORDER BY id DESC LIMIT 5;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("Latest 5 raw logs:")
    print(out)

    # Device table
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT device_id, ip, last_heartbeat, connection_count, status FROM fire_platform.gb26875_device;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("\nDevice table:")
    print(out)

    client.close()

if __name__ == '__main__':
    main()
