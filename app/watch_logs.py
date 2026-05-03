import paramiko
import time

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

    # Poll logs every 10 seconds for 60 seconds
    for i in range(6):
        time.sleep(10)
        stdin, stdout, stderr = client.exec_command("tail -n 20 /opt/my-fire-api/logs/out.log")
        out = stdout.read().decode('utf-8', errors='replace')
        lines = [l for l in out.strip().split('\n') if 'GB26875' in l or 'QUERY' in l]
        if lines:
            print(f"--- Poll {i+1} ({(i+1)*10}s) ---")
            for l in lines:
                print(l)

    client.close()

if __name__ == '__main__':
    main()
