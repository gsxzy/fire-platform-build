import paramiko
import os

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_DIR = "/opt/my-fire-api"
LOCAL_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    try:
        # Upload gb26875Server.js (port changed to 9200)
        local_path = os.path.join(LOCAL_BACKEND_DIR, 'gb26875Server.js')
        remote_path = f"{REMOTE_DIR}/gb26875Server.js"
        sftp.put(local_path, remote_path)
        print("Uploaded gb26875Server.js (port 9200)")

        # Update iptables: remove old 5200 rule, add 9200 rule
        cmds = [
            "iptables -D INPUT -p tcp --dport 5200 -j ACCEPT 2>/dev/null || true",
            "iptables -I INPUT -p tcp --dport 9200 -j ACCEPT || true",
            "iptables-save > /etc/iptables.rules 2>/dev/null || true",
        ]
        for cmd in cmds:
            stdin, stdout, stderr = client.exec_command(cmd)
            stdout.channel.recv_exit_status()
        print("Firewall updated: removed 5200, added 9200")

        # Restart backend
        stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_DIR} && pm2 restart all")
        stdout.channel.recv_exit_status()
        print("Backend restarted")

        # Wait and check
        import time
        time.sleep(2)
        stdin, stdout, stderr = client.exec_command("ss -tlnp | grep 9200")
        result = stdout.read().decode().strip()
        if result:
            print("Port 9200 is listening:")
            print(result)
        else:
            print("WARNING: Port 9200 NOT listening")

        stdin, stdout, stderr = client.exec_command("ss -tlnp | grep 5200")
        result = stdout.read().decode().strip()
        if not result:
            print("Port 5200 successfully stopped")
        else:
            print("Port 5200 still listening:")
            print(result)

    finally:
        sftp.close()
        client.close()

if __name__ == '__main__':
    deploy()
