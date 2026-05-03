import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 1. 查看旧进程的启动时间和命令行
stdin, stdout, stderr = ssh.exec_command("ps -eo pid,lstart,cmd | grep 1830359 | grep -v grep")
out = stdout.read().decode('utf-8', errors='replace')
print('=== OLD PROCESS ===')
print(out)

# 2. 查看它的启动方式（systemd 还是手动）
stdin, stdout, stderr = ssh.exec_command("cat /proc/1830359/cgroup")
out = stdout.read().decode('utf-8', errors='replace')
print('=== CGROUP ===')
print(out)

# 3. 杀掉旧进程
stdin, stdout, stderr = ssh.exec_command("kill -9 1830359 && echo 'Killed 1830359'")
out = stdout.read().decode('utf-8', errors='replace')
print('=== KILL RESULT ===')
print(out)

# 4. 删除旧 iptables 规则，添加新规则 5201->5205
stdin, stdout, stderr = ssh.exec_command("iptables -t nat -D PREROUTING 1 && iptables -t nat -A PREROUTING -p tcp --dport 5201 -j REDIRECT --to-port 5205 && echo 'iptables updated'")
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('=== IPTABLES UPDATE ===')
print(out)
if err:
    print('ERR:', err)

# 5. 验证
stdin, stdout, stderr = ssh.exec_command("iptables -t nat -L PREROUTING -n --line-numbers | grep 5201")
out = stdout.read().decode('utf-8', errors='replace')
print('=== NEW IPTABLES ===')
print(out or '(no rule)')

stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep -E '520[56]'")
out = stdout.read().decode('utf-8', errors='replace')
print('=== PORTS ===')
print(out)

ssh.close()
