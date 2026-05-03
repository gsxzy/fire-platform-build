import paramiko
import sys
import time

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
    run_cmd('df -h | grep "/dev/vda1"', 'Disk before killing head')
    run_cmd('ps aux | grep "head.*wvp.log" | grep -v grep', 'Head process holding deleted file')
    
    # Kill the head process
    run_cmd('pkill -f "head.*wvp.log" || kill -9 479862', 'Killing head process')
    time.sleep(1)
    
    run_cmd('ps aux | grep "head.*wvp.log" | grep -v grep || echo "head process killed"', 'Verify head is killed')
    
    # Check disk after
    run_cmd('df -h | grep "/dev/vda1"', 'Disk after killing head')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs size')
    run_cmd('lsof | grep "wvp.log (deleted)" | head -n 3', 'Any remaining deleted handles')
finally:
    ssh.close()
