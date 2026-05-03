import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

report = []

def run(cmd, desc):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    report.append(f"[{desc}]\nCMD: {cmd}\nOUT: {out[:200]}\nERR: {err[:200]}\n")
    return out, err

report.append("=" * 60)
report.append("服务器清理计划")
report.append("=" * 60)

# 1. 停止旧智慧消防平台进程
report.append("\n[1] 停止旧智慧消防平台进程")
run("pkill -f 'api_service.py' || true", "kill api_service.py")
run("pkill -f 'simple_device_service.py' || true", "kill simple_device_service.py")
run("pkill -f 'simple-platform.py' || true", "kill simple-platform.py")

# 2. 停止并删除无关Docker容器
report.append("\n[2] 停止并删除无关Docker容器")
containers = [
    "fire-redis", "fire-postgres", "ws-alarm-service",
    "tcp-receiver", "fire-safety-postgres",
    "wvp-mysql", "wvp-redis", "wvp-zlm"
]
for c in containers:
    run(f"docker stop {c} 2>/dev/null || true", f"stop {c}")
    run(f"docker rm {c} 2>/dev/null || true", f"rm {c}")

# 3. 删除旧目录
report.append("\n[3] 删除旧目录")
run("rm -rf /opt/smart-fire-platform/", "rm /opt/smart-fire-platform")
run("rm -rf /opt/tcp-receiver/", "rm /opt/tcp-receiver")
run("rm -rf /tmp/dist-deploy-new/", "rm /tmp/dist-deploy-new")
run("rm -rf /opt/fscn8001_proxy/", "rm /opt/fscn8001_proxy")

# 4. 清理日志
report.append("\n[4] 清理旧日志")
run("find /var/log -name '*smart-fire*' -delete 2>/dev/null || true", "del smart-fire logs")
run("find /var/log -name '*fire-control*' -delete 2>/dev/null || true", "del fire-control logs")
run("find /var/log -name 'btmp-*' -mtime +7 -delete 2>/dev/null || true", "del old btmp")
run("> /var/log/fscn8001.log 2>/dev/null || true", "truncate fscn8001.log")

# 5. 清理WVP目录（保留，仅报告大小）
report.append("\n[5] WVP目录状态")
out, _ = run("du -sh /opt/wvp/ 2>/dev/null || echo 'not found'", "wvp size")

# 6. 检查剩余进程
report.append("\n[6] 剩余关键进程")
out, _ = run("ps aux | grep -E 'node|python' | grep -v grep | grep -v 'ps aux'", "remaining processes")
report.append(out)

# 7. 检查剩余端口
report.append("\n[7] 剩余监听端口")
out, _ = run("ss -tlnp | grep -E 'LISTEN'", "listening ports")
report.append(out)

# 8. 磁盘使用
report.append("\n[8] 磁盘使用")
out, _ = run("df -h /", "disk usage")
report.append(out)

with open('D:/cleanup_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))

client.close()
print("Cleanup done. Report saved to D:/cleanup_report.txt")
