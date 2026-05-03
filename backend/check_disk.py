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
    run_cmd('df -h', 'Disk usage overview')
    run_cmd('du -sh /* 2>/dev/null | sort -rh | head -n 15', 'Top-level directories')
    run_cmd('du -sh /opt/* 2>/dev/null | sort -rh | head -n 15', '/opt directories')
    run_cmd('du -sh /var/* 2>/dev/null | sort -rh | head -n 15', '/var directories')
    run_cmd('du -sh /usr/* 2>/dev/null | sort -rh | head -n 15', '/usr directories')
    run_cmd('du -sh /www/* 2>/dev/null | sort -rh | head -n 15', '/www directories')
    run_cmd('du -sh /root/* 2>/dev/null | sort -rh | head -n 15', '/root directories')
    run_cmd('du -sh /tmp/* 2>/dev/null | sort -rh | head -n 15', '/tmp directories')
    run_cmd('du -sh /opt/my-fire-api/* 2>/dev/null | sort -rh | head -n 20', 'Backend files')
    run_cmd('find /opt/my-fire-api -type f -size +10M 2>/dev/null | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -n 20', 'Large files in backend')
    run_cmd('find /var/log -type f -size +10M 2>/dev/null | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -n 20', 'Large log files')
    run_cmd('du -sh /var/log/* 2>/dev/null | sort -rh | head -n 15', 'Log directories')
    run_cmd('du -sh /www/wwwroot/* 2>/dev/null | sort -rh | head -n 15', 'Web root directories')
    run_cmd('ls -lh /opt/my-fire-api/logs/ 2>/dev/null | sort -k5 -rh', 'Backend logs')
    run_cmd('find / -type f -size +50M 2>/dev/null | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -n 30', 'All large files (>50MB)')
finally:
    ssh.close()
    sys.stdout.write('\n=== Analysis complete ===\n')
