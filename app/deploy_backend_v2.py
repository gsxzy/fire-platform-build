import paramiko
import os

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_API = "/opt/my-fire-api"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

files_to_upload = [
    ("backend/gb26875Server.js", f"{REMOTE_API}/gb26875Server.js"),
    ("backend/services/deviceControl.service.js", f"{REMOTE_API}/services/deviceControl.service.js"),
    ("backend/routes/deviceControl.js", f"{REMOTE_API}/routes/deviceControl.js"),
    ("backend/routes/index.js", f"{REMOTE_API}/routes/index.js"),
    ("sql/fire_control_command.sql", "/tmp/fire_control_command.sql"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    print("[1/5] Uploading backend files...")
    for local, remote in files_to_upload:
        local_path = os.path.join(LOCAL_DIR, local)
        if os.path.exists(local_path):
            sftp.put(local_path, remote)
            print(f"  OK: {local} -> {remote}")
        else:
            print(f"  SKIP: {local} not found")

    print("\n[2/5] Installing new dependencies (jsmodbus, mqtt)...")
    stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_API} && npm install jsmodbus mqtt 2>&1")
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out[-500:] if len(out) > 500 else out)
    if err.strip(): print("ERR:", err[-500:])

    print("\n[3/5] Running SQL: fire_control_command.sql")
    stdin, stdout, stderr = client.exec_command(
        "mysql -u root -pZhangcong2255 fire_platform < /tmp/fire_control_command.sql 2>&1"
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    else: print("  OK")

    print("\n[4/5] Restarting PM2 fire-api...")
    stdin, stdout, stderr = client.exec_command("/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1")
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(out if out else "(no output)")
    if err: print("ERR:", err)

    print("\n[5/5] Checking service status...")
    stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/health | head -c 150")
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print("Health:", out)

    print("\nDeployment completed!")
finally:
    sftp.close()
    client.close()
