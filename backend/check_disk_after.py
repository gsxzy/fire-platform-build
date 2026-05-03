import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run_cmd(cmd, label):
    sys.stdout.write(f'\n=== {label} ===\n')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    if err.strip():
        sys.stdout.write('ERR: ' + err.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

try:
    run_cmd('df -h | grep "/dev/vda1"', 'Current disk usage')
    run_cmd('ps aux | grep "wvp-pro.jar" | grep -v grep', 'WVP process status')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs size')
    run_cmd('ls -lh /opt/wvp/logs/wvp.log', 'wvp.log current size')
    run_cmd('lsof | grep "/opt/wvp/logs/wvp.log" | head -n 3', 'File handles on wvp.log')
finally:
    ssh.close()
