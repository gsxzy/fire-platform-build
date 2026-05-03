import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Get all distinct cmd values in raw logs
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT cmd, COUNT(*) as cnt FROM fire_platform.gb26875_raw_log GROUP BY cmd ORDER BY cnt DESC;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== All cmd types in raw_log ===")
    print(out)
    print()

    # Check if there are any records after restart
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT MAX(created_at) as latest FROM fire_platform.gb26875_raw_log;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Latest record time ===")
    print(out)
    print()

    # Check latest 10 logs
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT id, device_id, cmd, HEX(raw_data), created_at FROM fire_platform.gb26875_raw_log ORDER BY id DESC LIMIT 10;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Latest 10 records ===")
    print(out)

    client.close()

if __name__ == '__main__':
    main()
