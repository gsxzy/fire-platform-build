import paramiko
import time

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Get latest GB26875 logs
    stdin, stdout, stderr = client.exec_command("tail -n 20 /opt/my-fire-api/logs/out.log | grep GB26875")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Latest GB26875 logs ===")
    print(out if out else "(no new logs)")
    print()

    # Check connections
    stdin, stdout, stderr = client.exec_command("ss -tnp | grep 5200")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== 5200 connections ===")
    print(out if out else "(none)")
    print()

    # Check raw log count since restart
    stdin, stdout, stderr = client.exec_command("mysql -u root -p'Zhangcong2255' -e \"SELECT cmd, COUNT(*) FROM fire_platform.gb26875_raw_log WHERE created_at > '2026-04-28 13:06:00' GROUP BY cmd;\"")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Raw logs by cmd (since 13:06) ===")
    print(out)

    client.close()

if __name__ == '__main__':
    main()
