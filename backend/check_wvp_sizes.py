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
    run_cmd('du -ch /opt/wvp/logs/wvp-2026-04-29*.log 2>/dev/null | grep total', 'Apr 29 total size')
    run_cmd('du -ch /opt/wvp/logs/wvp-2026-04-30*.log 2>/dev/null | grep total', 'Apr 30 total size')
    run_cmd('du -ch /opt/wvp/logs/wvp-2026-05-01*.log 2>/dev/null | grep total', 'May 1 total size')
    run_cmd('df -h | grep "/dev/vda1"', 'Current disk usage')
finally:
    ssh.close()
