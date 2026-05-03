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
    run_cmd('df -h | grep "/dev/vda1"', 'Disk before cleanup')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs before cleanup')
    
    # Delete logs older than 3 days based on filename date
    run_cmd('cutoff=$(date -d "3 days ago" +%Y-%m-%d); for f in /opt/wvp/logs/wvp-*.log; do if [ -f "$f" ]; then d=$(echo "$f" | grep -oP "wvp-\\K[0-9]{4}-[0-9]{2}-[0-9]{2}"); if [ -n "$d" ] && [ "$d" \\< "$cutoff" ]; then rm -f "$f"; fi; fi; done; echo "Done"', 'Deleting WVP logs older than 3 days')
    
    # Update cleanup script to 3 days
    cron_script = '''#!/bin/bash
# WVP log cleanup - delete logs older than 3 days based on filename
cutoff=$(date -d "3 days ago" +%Y-%m-%d)
for f in /opt/wvp/logs/wvp-*.log; do
    if [ -f "$f" ]; then
        date_str=$(echo "$f" | grep -oP "wvp-\\K[0-9]{4}-[0-9]{2}-[0-9]{2}")
        if [ -n "$date_str" ] && [ "$date_str" \\< "$cutoff" ]; then
            rm -f "$f"
        fi
    fi
done
'''
    sftp = ssh.open_sftp()
    with sftp.file('/opt/wvp/cleanup_logs.sh', 'w') as f:
        f.write(cron_script.encode('utf-8'))
    sftp.close()
    
    run_cmd('chmod +x /opt/wvp/cleanup_logs.sh', 'Updated cleanup script (3 days)')
    
    # Update logrotate to rotate 3 days
    logrotate_content = '''/opt/wvp/logs/wvp.log {
    daily
    rotate 3
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    size 100M
    copytruncate
}
'''
    sftp = ssh.open_sftp()
    with sftp.file('/etc/logrotate.d/wvp', 'w') as f:
        f.write(logrotate_content.encode('utf-8'))
    sftp.close()
    
    logrotate_dated = '''/opt/wvp/logs/wvp-*.log {
    daily
    rotate 3
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    size 50M
}
'''
    sftp = ssh.open_sftp()
    with sftp.file('/etc/logrotate.d/wvp-dated', 'w') as f:
        f.write(logrotate_dated.encode('utf-8'))
    sftp.close()
    
    run_cmd('logrotate -d /etc/logrotate.d/wvp 2>&1 | head -n 10', 'Updated logrotate config (3 days)')
    
    # Check after cleanup
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs after cleanup')
    run_cmd('df -h | grep "/dev/vda1"', 'Disk after cleanup')
    run_cmd('ls -1 /opt/wvp/logs/wvp-*.log 2>/dev/null | wc -l', 'Remaining WVP log files')
    
    sys.stdout.write('\n=== Cleanup complete (3-day retention) ===\n')
finally:
    ssh.close()
