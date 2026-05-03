import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    results = []

    # PM2 status (no streaming)
    stdin, stdout, stderr = client.exec_command("pm2 status fire-api")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== PM2 status ===")
    results.append(out)
    results.append("")

    # Tail log file directly (not pm2 logs)
    stdin, stdout, stderr = client.exec_command("tail -n 30 /root/.pm2/logs/fire-api-out.log")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Last 30 PM2 out logs ===")
    results.append(out)
    results.append("")

    # Connections
    stdin, stdout, stderr = client.exec_command("ss -tnp | grep 5200")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== 5200 connections ===")
    results.append(out if out else "(none)")

    client.close()

    with open('check_status_result.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print('Done')

if __name__ == '__main__':
    main()
