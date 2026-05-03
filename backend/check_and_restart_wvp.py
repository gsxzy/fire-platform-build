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
    # Check if WVP is running
    run_cmd('ps aux | grep -i wvp | grep -v grep', 'WVP processes')
    run_cmd('lsof | grep "/opt/wvp/logs/wvp.log" | head -n 5', 'Processes holding wvp.log')
    
    # Check file size
    run_cmd('ls -lh /opt/wvp/logs/wvp.log', 'wvp.log current size')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs total size')
    
    # Check disk
    run_cmd('df -h | grep "/dev/vda1"', 'Disk usage')
    
    # Restart WVP to release file handles
    run_cmd('systemctl restart wvp 2>/dev/null || echo "wvp service not found, trying jar..."', 'Restarting WVP service')
    run_cmd('ps aux | grep "wvp-pro.jar" | grep -v grep', 'WVP jar process')
    
    # If WVP is running as jar, kill and restart
    run_cmd('pkill -f "wvp-pro.jar" && sleep 2 && nohup java -jar /opt/wvp/wvp-pro.jar --spring.config.location=/opt/wvp/application.yml > /dev/null 2>&1 &', 'Restarting WVP jar')
    
    # Wait and check
    import time
    time.sleep(3)
    
    run_cmd('df -h | grep "/dev/vda1"', 'Disk usage after WVP restart')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs size after restart')
    run_cmd('ls -lh /opt/wvp/logs/wvp.log', 'wvp.log size after restart')
    
    # Also check if there are deleted but held files
    run_cmd('lsof | grep deleted | grep wvp | head -n 10', 'Deleted but held WVP files')
    
finally:
    ssh.close()
