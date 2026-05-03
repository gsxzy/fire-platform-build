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
    run_cmd('ls -lh /opt/wvp/logs/', 'WVP logs directory')
    run_cmd('tail -n 3 /opt/wvp/logs/wvp.log', 'WVP log last lines')
    run_cmd('du -sh /opt/wvp/* 2>/dev/null | sort -rh | head -n 10', 'WVP subdirectories')
    run_cmd('docker ps -a --size 2>/dev/null | head -n 10', 'Docker containers')
    run_cmd('docker system df 2>/dev/null', 'Docker disk usage')
    run_cmd('journalctl --disk-usage 2>/dev/null', 'Journal disk usage')
    run_cmd('ls -lhS /www/server/data/mysql-bin* 2>/dev/null | head -n 10', 'MySQL binlog files')
finally:
    ssh.close()
