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
    run_cmd('df -h | grep "/dev/vda1"', 'Disk before deletion')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs before deletion')
    run_cmd('ls -1 /opt/wvp/logs/wvp-2026-04-29*.log 2>/dev/null | wc -l', 'Apr 29 file count')
    
    run_cmd('rm -f /opt/wvp/logs/wvp-2026-04-29*.log', 'Deleting Apr 29 logs')
    
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs after deletion')
    run_cmd('df -h | grep "/dev/vda1"', 'Disk after deletion')
    run_cmd('ls -1 /opt/wvp/logs/wvp-*.log 2>/dev/null | wc -l', 'Remaining log files')
    
    run_cmd('ps aux | grep "wvp-pro.jar" | grep -v grep', 'WVP process status')
    
    sys.stdout.write('\n=== Deletion complete ===\n')
finally:
    ssh.close()
