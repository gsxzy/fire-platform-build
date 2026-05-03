import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Check if any C1/C2/C3 cmd types exist
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT cmd_type, COUNT(*) as cnt FROM fire_platform.gb26875_raw_log WHERE cmd_type IN ('C1','C2','C3') GROUP BY cmd_type;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Query response records ===")
    print(out if out.strip() else "(none)")
    print()

    # Check latest raw logs to see if device responded to queries
    stdin, stdout, stderr = client.exec_command("tail -n 30 /opt/my-fire-api/logs/out.log | grep -E 'RX|QUERY|C1|C2|C3'")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Latest RX/QUERY logs ===")
    print(out if out.strip() else "(no matching logs)")

    client.close()

if __name__ == '__main__':
    main()
