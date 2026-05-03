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
    # Check disk before
    run_cmd('df -h | grep "/dev/vda1"', 'Disk before restart')
    
    # Kill WVP java process
    run_cmd('pkill -f "wvp-pro.jar"', 'Killing WVP process')
    time.sleep(2)
    
    # Verify process is killed
    run_cmd('ps aux | grep "wvp-pro.jar" | grep -v grep || echo "WVP stopped"', 'WVP process status')
    
    # Check disk after kill (should release the deleted file)
    run_cmd('df -h | grep "/dev/vda1"', 'Disk after kill')
    run_cmd('du -sh /opt/wvp/logs/', 'WVP logs size after kill')
    
    # Restart WVP
    run_cmd('cd /opt/wvp && nohup /usr/lib/jvm/java-17-konajdk-17.0.17-1.oc9/bin/java -jar wvp-pro.jar --spring.config.location=/opt/wvp/application.yml > /opt/wvp/logs/wvp.log 2>&1 &', 'Starting WVP')
    time.sleep(5)
    
    # Verify WVP is running
    run_cmd('ps aux | grep "wvp-pro.jar" | grep -v grep', 'WVP running status')
    
    # Check disk after restart
    run_cmd('df -h | grep "/dev/vda1"', 'Disk after restart')
    run_cmd('ls -lh /opt/wvp/logs/wvp.log', 'New wvp.log size')
    
    sys.stdout.write('\n=== WVP restart complete ===\n')
finally:
    ssh.close()
