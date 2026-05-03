#!/usr/bin/env python3
"""FSCN8001 平台集成部署脚本"""
import paramiko
import os

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def run_cmd(client, cmd, desc=""):
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return exit_status, out, err

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    logs = []

    try:
        # 1. 确保目录存在
        run_cmd(client, "mkdir -p /opt/fsan /var/log")

        # 2. 上传并执行 SQL 创建表
        sftp.put("sql/fscn8001_tables.sql", "/tmp/fscn8001_tables.sql")
        ec, out, err = run_cmd(client, "mysql -u root -D fire_platform < /tmp/fscn8001_tables.sql")
        logs.append(f"[SQL] exit={ec}\nOUT:\n{out}\nERR:\n{err}")

        # 3. 上传集成版 fscn8001.js
        sftp.put("fscn8001_integrated.js", "/opt/fsan/fscn8001.js")
        run_cmd(client, "chmod +x /opt/fsan/fscn8001.js")

        # 4. 停止旧进程（如果有）
        run_cmd(client, "pkill -f 'fscn8001.js' || true")

        # 5. 部署后端 fireHostApi.js
        sftp.put("backend/fireHostApi.js", "/opt/my-fire-api/fireHostApi.js")
        ec, out, err = run_cmd(client, "cd /opt/my-fire-api && pm2 restart fire-api")
        logs.append(f"[PM2] exit={ec}\nOUT:\n{out}\nERR:\n{err}")

        # 6. 部署 systemd 服务
        sftp.put("fscn8001.service", "/etc/systemd/system/fscn8001.service")
        run_cmd(client, "systemctl daemon-reload")
        run_cmd(client, "systemctl enable fscn8001.service")
        ec, out, err = run_cmd(client, "systemctl restart fscn8001.service")
        logs.append(f"[SYSTEMD] exit={ec}\nOUT:\n{out}\nERR:\n{err}")

        # 7. 验证
        import time
        time.sleep(2)

        ec, out, _ = run_cmd(client, "systemctl is-active fscn8001.service")
        logs.append(f"[STATUS] fscn8001={out}")

        ec, out, _ = run_cmd(client, "ss -tlnp | grep 5205")
        logs.append(f"[PORT5205] {out}")

        ec, out, _ = run_cmd(client, "ss -tlnp | grep 5003")
        logs.append(f"[PORT5003] {out}")

        ec, out, _ = run_cmd(client, "mysql -u root -D fire_platform -e \"SHOW TABLES LIKE 'fscn8001%';\"")
        logs.append(f"[TABLES] {out}")

        logs.append("\n========== 部署完成 ==========")

    finally:
        sftp.close()
        client.close()

    with open('deploy_fscn8001_log.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(logs))
    print('Deployment log written to deploy_fscn8001_log.txt')

if __name__ == '__main__':
    deploy()
