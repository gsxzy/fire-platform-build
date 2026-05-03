import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    results = []

    # Latest app logs after restart (13:06:09)
    stdin, stdout, stderr = client.exec_command("tail -n 50 /opt/my-fire-api/logs/out.log")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Latest app logs ===")
    results.append(out)
    results.append("")

    # Check if any GB26875 raw logs after restart
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT COUNT(*) FROM fire_platform.gb26875_raw_log WHERE created_at > '2026-04-28 13:06:00';\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Raw logs after 13:06 ===")
    results.append(out)
    results.append("")

    # Check device table
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT device_id, ip, last_heartbeat, connection_count, status FROM fire_platform.gb26875_device;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Device table ===")
    results.append(out)

    client.close()

    with open('check_latest2_result.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print('Done')

if __name__ == '__main__':
    main()
