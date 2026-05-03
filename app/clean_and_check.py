import paramiko
import sys

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def safe_print(text):
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('gbk', errors='replace').decode('gbk'))

def ssh_exec(cmd, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=timeout)
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        return exit_status, out, err
    finally:
        client.close()

# 1. Clean fake alarms
safe_print("=== 清理 fscn8001_alarm 中的模拟数据 ===")
status, out, err = ssh_exec(
    "mysql -u root -p'Zhangcong2255' fire_platform -e \"DELETE FROM fscn8001_alarm WHERE device_sn = '8C0000000000000000000000'\" 2>/dev/null"
)
safe_print(out.strip())
if err.strip():
    safe_print("ERR: " + err.strip())

# Check remaining count
status, out, err = ssh_exec(
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'SELECT COUNT(*) FROM fscn8001_alarm' 2>/dev/null"
)
safe_print("清理后剩余: " + out.strip())

# 2. Check PM2 processes (save to file first to avoid encoding issues)
status, out, err = ssh_exec("pm2 list > /tmp/pm2_list.txt 2>&1; cat /tmp/pm2_list.txt")
safe_print("\n=== PM2 进程 ===")
safe_print(out)

# 3. Check crontab
status, out, err = ssh_exec("crontab -l 2>/dev/null || echo 'No crontab'")
safe_print("\n=== Crontab ===")
safe_print(out)

# 4. Check if there's a recurring client pushing data
status, out, err = ssh_exec(
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'SELECT id, device_sn, cmd_type, created_at FROM fscn8001_raw_log ORDER BY created_at DESC LIMIT 10' 2>/dev/null"
)
safe_print("\n=== 最近10条 fscn8001_raw_log ===")
safe_print(out)

# 5. Check netstat for port 5201 connections
status, out, err = ssh_exec("netstat -tn 2>/dev/null | grep ':5201' || ss -tn | grep ':5201' || echo 'No connections on 5201'")
safe_print("\n=== 端口 5201 连接 ===")
safe_print(out)

# 6. Check who is pushing to /api/fscn8001/push
status, out, err = ssh_exec("tail -50 /opt/my-fire-api/*.log 2>/dev/null || echo 'No log files found'")
safe_print("\n=== 后端日志最近50行 ===")
safe_print(out)
