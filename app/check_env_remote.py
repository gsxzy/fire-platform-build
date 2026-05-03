import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

_, out, _ = ssh.exec_command('cat /opt/my-fire-api/.env 2>/dev/null')
env_content = out.read().decode('utf-8', errors='replace')
print('=== Remote .env ===')
print(env_content if env_content.strip() else '(empty or not found)')

ssh.close()
