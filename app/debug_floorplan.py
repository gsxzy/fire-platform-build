import paramiko, json
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

cmds = [
    # Check backend logs for recent errors
    "cat /opt/my-fire-api/logs/*.log 2>/dev/null | tail -40",
    # Check if tables exist
    "mysql -u root -pZhangcong2255 fire_platform -e \"SHOW TABLES LIKE 'fire_%'\" 2>&1",
    # Check if buildings table has data
    "mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) FROM fire_building\" 2>&1",
    # Check if floors table has data
    "mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) FROM fire_floor\" 2>&1",
    # Check if device positions table has data
    "mysql -u root -pZhangcong2255 fire_platform -e \"SELECT COUNT(*) FROM fire_floor_device_position\" 2>&1",
    # Test API endpoints
    "curl -s http://127.0.0.1:5003/api/buildings 2>&1 | head -c 200",
    "curl -s http://127.0.0.1:5003/api/floors?building_id=1 2>&1 | head -c 200",
    # Check route registration in index.js
    "grep -n 'floorPlan\|deviceControl\|legacy' /opt/my-fire-api/routes/index.js",
    # Check if fireHostApi has conflicting routes
    "grep -n 'buildings\\|floors\\|/devices' /opt/my-fire-api/fireHostApi.js | head -20",
    # Check uploads directory exists
    "ls -la /opt/my-fire-api/uploads/floor-plans/ 2>&1 || echo 'uploads dir not found'",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(f'=== {cmd} ===')
    print(out if out else '(empty)')
    if err and 'Warning' not in err: print(f'ERR: {err}')
    print()

client.close()
