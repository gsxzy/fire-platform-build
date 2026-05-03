import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
token = json.loads(stdout.read().decode('utf-8', errors='replace'))['data']['accessToken']

endpoints = [
    # Dashboard
    ('GET', '/api/dashboard/stats'),
    ('GET', '/api/dashboard/subsystems'),
    # Units
    ('GET', '/api/units/list'),
    ('GET', '/api/units/stats/overview'),
    # Devices
    ('GET', '/api/devices/list'),
    ('GET', '/api/devices/status/realtime'),
    ('GET', '/api/devices/stats/overview'),
    # Device config / maintenance
    ('GET', '/api/device-configs/list'),
    ('GET', '/api/device-maintenances/list'),
    # Alarms
    ('GET', '/api/alarms/list'),
    ('GET', '/api/alarms/stats'),
    ('GET', '/api/alarms/recent'),
    # Fire hosts / FSCN / Control rooms
    ('GET', '/api/fire-hosts'),
    ('GET', '/api/fscn8001/devices'),
    ('GET', '/api/control-rooms'),
    # Users / Roles
    ('GET', '/api/users'),
    ('GET', '/api/roles'),
    # Video / Cameras
    ('GET', '/api/video/devices'),
    ('GET', '/api/cameras/list'),
    # GB28181
    ('GET', '/api/gb28181-devices'),
    # IoT
    ('GET', '/api/iot-devices'),
    ('GET', '/api/iot-devices/stats'),
    # Workbench
    ('GET', '/api/workbench'),
    # Buildings / Floors
    ('GET', '/api/buildings'),
    # GIS
    ('GET', '/api/gis/points-rich'),
    # Work orders / Maintenance
    ('GET', '/api/work-orders/list'),
    ('GET', '/api/maint-records/list'),
    ('GET', '/api/maint-contracts/list'),
    # Patrol / Hazards
    ('GET', '/api/patrol-plans/list'),
    ('GET', '/api/patrol-records/list'),
    ('GET', '/api/hazards/list'),
    # Plans / Drills
    ('GET', '/api/plans/list'),
    ('GET', '/api/drills/list'),
    # Inspections
    ('GET', '/api/inspections/list'),
    # Knowledge / Documents
    ('GET', '/api/documents/list'),
    # Notifications
    ('GET', '/api/notifications/list'),
    ('GET', '/api/notifications/unread'),
    # Duty
    ('GET', '/api/duty-schedules/list'),
    # Logs
    ('GET', '/api/system-logs/list'),
    # Floor plans
    ('GET', '/api/floor-plans/list'),
    # Bigscreen
    ('GET', '/api/bigscreen/data'),
    # Monitor
    ('GET', '/api/monitor/overview'),
    # Analysis
    ('GET', '/api/analysis/device'),
    ('GET', '/api/analysis/alarm'),
    # Control room specific
    ('GET', '/api/control-rooms/multiline'),
    ('GET', '/api/control-rooms/bus-points'),
    ('GET', '/api/control-rooms/command-logs'),
    ('GET', '/api/control-rooms/realtime'),
    ('GET', '/api/control-rooms/shields'),
    ('GET', '/api/control-rooms/videos'),
    # Personnel
    ('GET', '/api/personnel/list'),
    # SIP server
    ('GET', '/api/sip-server/status'),
    # DB stats
    ('GET', '/api/db/stats'),
    # Departments
    ('GET', '/api/departments'),
    # Permissions
    ('GET', '/api/permissions'),
    # Reports
    ('GET', '/api/reports/list'),
    # Duty shifts / handovers
    ('GET', '/api/duty-shifts/list'),
    ('GET', '/api/duty-handovers/list'),
    # Alarm snapshots
    ('GET', '/api/alarm-snapshots/list'),
    # Control room configs
    ('GET', '/api/control-room-configs/list'),
    # Floor devices
    ('GET', '/api/floor-devices/list'),
]

print('=== Comprehensive API Health Check ===')
ok_count = 0
fail_count = 0
failures = []
for method, path in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json http://127.0.0.1:5003{path} -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json')
    resp = stdout.read().decode('utf-8', errors='replace')
    
    try:
        data = json.loads(resp)
        biz_code = data.get('code', '?')
        msg = data.get('msg', data.get('message', '?'))[:50]
    except:
        biz_code = '?'
        msg = resp[:60]
    
    http_ok = code == '200'
    biz_ok = biz_code == 200
    ok = http_ok and biz_ok
    
    if ok:
        ok_count += 1
        status = 'OK'
    else:
        fail_count += 1
        status = f'FAIL(http={code},biz={biz_code})'
        failures.append((path, code, biz_code, msg))
    print(f'{status} {method} {path}')

print(f'\n=== Summary: {ok_count} OK, {fail_count} FAIL ===')
print('\n=== Failures ===')
for path, code, biz, msg in failures:
    print(f'{path}: HTTP={code}, biz={biz}, msg={msg}')

client.close()
