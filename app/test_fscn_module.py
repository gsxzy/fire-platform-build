import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Test require fscn8001Server
stdin, stdout, stderr = client.exec_command("cd /opt/my-fire-api && node -e 'const m = require(\"./fscn8001Server\"); console.log(\"OK\", Object.keys(m));' 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('Module load test:')
print('OUT:', out)
print('ERR:', err)

# Check FSCN log in out.log
stdin, stdout, stderr = client.exec_command("grep -i 'FSCN8001' /opt/my-fire-api/logs/out.log 2>/dev/null | tail -5")
print('\nFSCN log in out.log:')
print(stdout.read().decode('utf-8', errors='replace').strip())

# Check err.log for FSCN errors
stdin, stdout, stderr = client.exec_command("grep -i 'fscn\|linkage\|iotDevice\|alarm.service' /opt/my-fire-api/logs/err.log 2>/dev/null | tail -10")
print('\nFSCN errors in err.log:')
print(stdout.read().decode('utf-8', errors='replace').strip())

client.close()
