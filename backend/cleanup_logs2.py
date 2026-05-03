import paramiko
import sys
import re
from datetime import datetime, timedelta

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
WVP_LOGS = '/opt/wvp/logs'

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
    # 1. Check current status
    run_cmd(f'df -h | grep "/dev/vda1"', 'Disk usage before')
    run_cmd(f'du -sh {WVP_LOGS}', 'WVP logs size before')
    
    # 2. Delete old logs by filename date (keep last 7 days)
    # Files like wvp-2026-04-29.0.log -> date is 2026-04-29
    cutoff = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    sys.stdout.write(f'\n=== Deleting WVP logs older than {cutoff} ===\n')
    
    # List all wvp log files and filter by date in filename
    stdin, stdout, stderr = ssh.exec_command(f'ls -1 {WVP_LOGS}/wvp-*.log 2>/dev/null')
    files = stdout.read().decode('utf-8', errors='replace').strip().split('\n')
    
    deleted_count = 0
    deleted_size = 0
    sftp = ssh.open_sftp()
    
    for f in files:
        if not f.strip():
            continue
        # Extract date from filename like /opt/wvp/logs/wvp-2026-04-29.0.log
        match = re.search(r'wvp-(\d{4}-\d{2}-\d{2})', f)
        if match:
            file_date = match.group(1)
            if file_date < cutoff:
                try:
                    size = sftp.stat(f).st_size
                    sftp.remove(f)
                    deleted_count += 1
                    deleted_size += size
                except Exception as e:
                    sys.stdout.write(f'Failed to delete {f}: {e}\n')
    
    sftp.close()
    sys.stdout.write(f'Deleted {deleted_count} old log files ({deleted_size / (1024**3):.2f} GB)\n')
    
    # 3. Handle the 47G wvp.log main file
    sys.stdout.write(f'\n=== Handling 47G wvp.log ===\n')
    # Copy last 1000 lines to a temp file, then truncate
    run_cmd(f'cd {WVP_LOGS} && tail -n 1000 wvp.log > wvp.log.last1000 && mv wvp.log.last1000 wvp.log', 'Truncating wvp.log (keeping last 1000 lines)')
    
    # 4. Clean other logs
    run_cmd('journalctl --vacuum-time=7d 2>/dev/null || true', 'Cleaning systemd journal')
    run_cmd('find /var/log -name "btmp-*" -mtime +7 -type f -delete 2>/dev/null || true', 'Cleaning old btmp')
    
    # 5. Check after cleanup
    run_cmd(f'du -sh {WVP_LOGS}', 'WVP logs size after')
    run_cmd('df -h | grep "/dev/vda1"', 'Disk usage after')
    
    # 6. Update logrotate config to handle the main wvp.log
    logrotate_content = '''/opt/wvp/logs/wvp.log {
    daily
    rotate 7
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
    sys.stdout.write('\nUpdated /etc/logrotate.d/wvp with copytruncate for wvp.log\n')
    
    # 7. Also configure logrotate for the dated files (wvp-YYYY-MM-DD.*.log)
    logrotate_dated = '''/opt/wvp/logs/wvp-*.log {
    daily
    rotate 7
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
    sys.stdout.write('Created /etc/logrotate.d/wvp-dated\n')
    
    # 8. Test logrotate config
    run_cmd('logrotate -d /etc/logrotate.d/wvp 2>&1 | head -n 15', 'Testing logrotate config')
    
    # 9. Update cron to also clean by filename date (not mtime)
    cron_script = '''#!/bin/bash
# WVP log cleanup - delete logs older than 7 days based on filename
cutoff=$(date -d "7 days ago" +%Y-%m-%d)
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
    run_cmd('chmod +x /opt/wvp/cleanup_logs.sh', 'Making cleanup script executable')
    run_cmd('(crontab -l 2>/dev/null | grep -v "cleanup_logs.sh"; echo "0 3 * * * /opt/wvp/cleanup_logs.sh") | crontab -', 'Adding cron job')
    
    sys.stdout.write('\n=== All done ===\n')
finally:
    ssh.close()
