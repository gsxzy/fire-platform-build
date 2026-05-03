import paramiko
import sys

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
    # 1. Check current disk usage and WVP logs size
    run_cmd(f'df -h | grep "/dev/vda1"', 'Before cleanup - Disk usage')
    run_cmd(f'du -sh {WVP_LOGS}', 'Before cleanup - WVP logs size')
    run_cmd(f'ls -1 {WVP_LOGS}/wvp-*.log 2>/dev/null | wc -l', 'WVP log file count')
    
    # 2. Clean up old WVP logs (keep 7 days)
    run_cmd(f'find {WVP_LOGS} -name "wvp-*.log" -mtime +7 -type f | wc -l', 'Files to delete (>7 days)')
    run_cmd(f'find {WVP_LOGS} -name "wvp-*.log" -mtime +7 -type f -delete', 'Deleting old WVP logs')
    
    # Also clean any wvp.log if it's huge (the main log file)
    run_cmd(f'ls -lh {WVP_LOGS}/wvp.log 2>/dev/null || echo "wvp.log not found"', 'Main wvp.log status')
    
    # 3. Clean other old logs
    run_cmd('find /var/log -name "*.log-*" -mtime +30 -type f -delete 2>/dev/null', 'Deleting old rotated system logs')
    run_cmd('find /var/log -name "*.gz" -mtime +30 -type f -delete 2>/dev/null', 'Deleting old compressed logs')
    
    # Clean journal logs older than 7 days
    run_cmd('journalctl --vacuum-time=7d 2>/dev/null || echo "journalctl not available or failed"', 'Cleaning systemd journal (keep 7d)')
    
    # 4. Clean btmp rotated files
    run_cmd('find /var/log -name "btmp-*" -mtime +7 -type f -delete 2>/dev/null', 'Deleting old btmp logs')
    
    # 5. Check after cleanup
    run_cmd(f'du -sh {WVP_LOGS}', 'After cleanup - WVP logs size')
    run_cmd('df -h | grep "/dev/vda1"', 'After cleanup - Disk usage')
    
    # 6. Configure logrotate for WVP
    logrotate_content = '''/opt/wvp/logs/wvp*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        /bin/kill -HUP $(cat /var/run/syslogd.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
'''
    
    sys.stdout.write('\n=== Creating logrotate config for WVP ===\n')
    sftp = ssh.open_sftp()
    with sftp.file('/etc/logrotate.d/wvp', 'w') as f:
        f.write(logrotate_content.encode('utf-8'))
    sftp.close()
    sys.stdout.write('Created /etc/logrotate.d/wvp\n')
    
    # Verify logrotate config
    run_cmd('logrotate -d /etc/logrotate.d/wvp 2>&1 | head -n 20', 'Logrotate config test (dry-run)')
    
    # 7. Add a cron job for WVP log cleanup (as backup)
    cron_line = '0 3 * * * find /opt/wvp/logs -name "wvp-*.log" -mtime +7 -type f -delete > /dev/null 2>&1\n'
    run_cmd('(crontab -l 2>/dev/null | grep -v "find /opt/wvp/logs"; echo "' + cron_line.strip() + '") | crontab -', 'Adding daily cron for WVP log cleanup')
    
    # 8. Clean Docker if needed
    run_cmd('docker system prune -f --volumes 2>/dev/null || echo "Docker prune not available"', 'Docker system prune')
    
    # Final check
    run_cmd('df -h | grep "/dev/vda1"', 'Final disk usage')
    
    sys.stdout.write('\n=== Cleanup complete ===\n')
finally:
    ssh.close()
