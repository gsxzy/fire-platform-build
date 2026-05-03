import paramiko

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    stdin, stdout, stderr = client.exec_command("pm2 logs fire-api --lines 20")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== PM2 last 20 logs ===")
    print(out)
    print()

    stdin, stdout, stderr = client.exec_command("pm2 status")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== PM2 status ===")
    print(out)
    print()

    stdin, stdout, stderr = client.exec_command("pm2 show fire-api | grep -A5 'restart' ")
    out = stdout.read().decode('utf-8', errors='replace')
    print("=== PM2 restart info ===")
    print(out)

    client.close()

if __name__ == '__main__':
    main()
