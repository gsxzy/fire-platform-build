import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 -e 'SHOW TABLES;' fire_platform")
tables = stdout.read().decode('utf-8', errors='replace').strip().split('\n')
print(f'Total tables: {len(tables)}')
# Check key missing tables
for t in ['work_orders', 'patrol_plans', 'hazards', 'plans', 'drills', 'inspections', 'documents', 'notifications', 'duty_schedules', 'departments', 'linkage_rules', 'linkage_records']:
    status = 'OK' if t in tables else 'MISSING'
    print(f'{t}: {status}')
client.close()
