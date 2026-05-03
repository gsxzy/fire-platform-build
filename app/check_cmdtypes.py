import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    results = []

    # Get all distinct cmd_type values
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT cmd_type, COUNT(*) as cnt FROM fire_platform.gb26875_raw_log GROUP BY cmd_type ORDER BY cnt DESC;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== All cmd_type in raw_log ===")
    results.append(out)
    results.append("")

    # Latest 10 logs with cmd_type
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT id, device_id, cmd_type, hex_data, created_at FROM fire_platform.gb26875_raw_log ORDER BY id DESC LIMIT 10;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Latest 10 records ===")
    results.append(out)
    results.append("")

    # Count since restart
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT COUNT(*) FROM fire_platform.gb26875_raw_log WHERE created_at > '2026-04-28 13:06:00';\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Records since 13:06 ===")
    results.append(out)

    client.close()

    with open('check_cmdtypes_result.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print('Done')

if __name__ == '__main__':
    main()
