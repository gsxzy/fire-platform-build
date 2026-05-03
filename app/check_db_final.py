import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

mysql_cmd = 'mysql -uroot fire_platform -e'

# 1. List all tables
_, out, _ = ssh.exec_command(mysql_cmd + ' "SHOW TABLES;"')
tables_raw = out.read().decode('utf-8', errors='replace').strip()
all_tables = [line.strip() for line in tables_raw.splitlines()[1:] if line.strip()]
print('=== ALL TABLES IN fire_platform ===')
for t in all_tables:
    print(t)
print(f'Total: {len(all_tables)} tables')
print()

# 2. Row counts for specific tables
expected_tables = [
    'fire_host', 'fire_loop', 'fire_device', 'users',
    'control_room_realtime', 'control_room_shield', 'control_room_command_log',
    'control_room_video', 'multiline_panel', 'bus_panel'
]

print('=== ROW COUNTS FOR EXPECTED TABLES ===')
for tbl in expected_tables:
    if tbl in all_tables:
        _, out, _ = ssh.exec_command(mysql_cmd + f' "SELECT COUNT(*) FROM {tbl};"')
        result = out.read().decode('utf-8', errors='replace').strip()
        lines = [l.strip() for l in result.splitlines() if l.strip()]
        count = lines[-1] if lines else 'N/A'
        print(f'{tbl}: {count} rows')
    else:
        print(f'{tbl}: MISSING')
print()

# 3. Missing tables
print('=== MISSING TABLES (backend expects) ===')
missing = [tbl for tbl in expected_tables if tbl not in all_tables]
if missing:
    for tbl in missing:
        print(f'- {tbl}')
else:
    print('None - all expected tables exist.')
print()

# 4. Extra tables not in expected list
print('=== EXTRA TABLES (not in backend expected list) ===')
extra = [tbl for tbl in all_tables if tbl not in expected_tables]
if extra:
    for tbl in extra:
        _, out, _ = ssh.exec_command(mysql_cmd + f' "SELECT COUNT(*) FROM {tbl};"')
        result = out.read().decode('utf-8', errors='replace').strip()
        lines = [l.strip() for l in result.splitlines() if l.strip()]
        count = lines[-1] if lines else 'N/A'
        print(f'{tbl}: {count} rows')
else:
    print('None.')

ssh.close()
