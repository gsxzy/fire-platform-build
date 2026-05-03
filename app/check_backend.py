import paramiko, json, re
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Check backend routes
stdin, stdout, stderr = client.exec_command('ls /opt/my-fire-api/routes/*.js')
print('=== Routes ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check app.js for mounted routes
stdin, stdout, stderr = client.exec_command("grep -n 'app.use' /opt/my-fire-api/app.js")
print('\n=== Mounted routes in app.js ===')
lines = stdout.read().decode('utf-8', errors='replace').strip().split('\n')
for line in lines:
    print(line)

# Check for linkage route files
stdin, stdout, stderr = client.exec_command('ls /opt/my-fire-api/routes/ | grep -i link')
print('\n=== Linkage routes ===')
print(stdout.read().decode('utf-8', errors='replace') or '(none)')

# Check for inspection route files
stdin, stdout, stderr = client.exec_command('ls /opt/my-fire-api/routes/ | grep -i inspect')
print('\n=== Inspection routes ===')
print(stdout.read().decode('utf-8', errors='replace') or '(none)')

# Check for fault route files
stdin, stdout, stderr = client.exec_command('ls /opt/my-fire-api/routes/ | grep -i fault')
print('\n=== Fault routes ===')
print(stdout.read().decode('utf-8', errors='replace') or '(none)')

# Check which pages might fail by searching for table names in routes
for keyword in ['linkage_rules', 'linkage_records', 'device_faults', 'inspection_tasks']:
    stdin, stdout, stderr = client.exec_command(f"grep -rn '{keyword}' /opt/my-fire-api/ --include='*.js' 2>/dev/null | head -5")
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if out:
        print(f'\n=== {keyword} references ===')
        print(out)

client.close()
