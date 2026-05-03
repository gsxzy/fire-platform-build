import paramiko
import sys
import time

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    sys.stdout.write('Killing head process...\n')
    ssh.exec_command('kill -9 479862 2>/dev/null || true')
    time.sleep(2)
    
    sys.stdout.write('\n=== Disk usage after kill ===\n')
    stdin, stdout, stderr = ssh.exec_command('df -h | grep "/dev/vda1"')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    
    sys.stdout.write('\n=== WVP logs size ===\n')
    stdin, stdout, stderr = ssh.exec_command('du -sh /opt/wvp/logs/')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    
    sys.stdout.write('\n=== WVP process status ===\n')
    stdin, stdout, stderr = ssh.exec_command('ps aux | grep "wvp-pro.jar" | grep -v grep')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    
    sys.stdout.write('\nDone\n')
finally:
    ssh.close()
