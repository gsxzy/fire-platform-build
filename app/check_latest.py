import paramiko
import time

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Check connections
    stdin, stdout, stderr = client.exec_command("ss -tnp | grep -i 5200")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== 5200 Connections ===")
    print(out if out else "(no connections)")
    print()

    # Check last 30 lines of full log (not just GB26875) to catch restart
    stdin, stdout, stderr = client.exec_command("tail -n 40 /opt/my-fire-api/logs/out.log")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Last 40 log lines ===")
    print(out if out else "(no logs)")
    print()

    # Verify code on server
    stdin, stdout, stderr = client.exec_command("grep -n 'allocUnsafe' /opt/my-fire-api/gb26875Server.js")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== Server code ===")
    print(out)

    client.close()

if __name__ == '__main__':
    main()
