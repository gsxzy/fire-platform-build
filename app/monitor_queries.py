import paramiko
import time

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    results = []

    # Wait a bit for device to reconnect and queries to be sent
    time.sleep(5)

    # Get latest GB26875 logs
    stdin, stdout, stderr = client.exec_command("tail -n 50 /opt/my-fire-api/logs/out.log | grep -E 'GB26875|QUERY'")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Latest GB26875 + QUERY logs ===")
    results.append(out if out else "(no logs)")
    results.append("")

    # Check connections
    stdin, stdout, stderr = client.exec_command("ss -tnp | grep 5200")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== 5200 connections ===")
    results.append(out if out else "(none)")
    results.append("")

    # Check if any new cmd types appeared
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT cmd_type, COUNT(*) as cnt FROM fire_platform.gb26875_raw_log WHERE created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) GROUP BY cmd_type;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append("=== Recent cmd types (last 2 min) ===")
    results.append(out)

    client.close()

    with open('monitor_queries_result.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print('Done')

if __name__ == '__main__':
    main()
