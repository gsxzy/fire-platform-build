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
    # Core
    ('GET', '/api/dashboard/stats'),
    ('GET', '/api/dashboard/subsystems'),
    ('GET', '/api/workbench'),
    # Units
    ('GET', '/api/units/list'),
    ('GET', '/api/units/stats/overview'),
    ('GET', '/api/buildings'),
    ('GET', '/api/gis/points-rich'),
    # Devices
    ('GET', '/api/devices/list'),
    ('GET', '/api/devices/status/realtime'),
    ('GET', '/api/devices/stats/overview'),
    ('GET', '/api/device-configs/list'),
    ('GET', '/api/device-maintenances/list'),
    # Alarms
    ('GET', '/api/alarms/list'),
    ('GET', '/api/alarms/stats'),
    ('GET', '/api/alarms/recent'),
    # Fire hosts / Control
    ('GET', '/api/fire-hosts'),
    ('GET', '/api/fscn8001/devices'),
    ('GET', '/api/control-rooms'),
    ('GET', '/api/control-rooms/multiline'),
    ('GET', '/api/control-rooms/bus-points'),
    ('GET', '/api/control-rooms/command-logs'),
    ('GET', '/api/control-rooms/realtime'),
    ('GET', '/api/control-rooms/shields'),
    ('GET', '/api/control-rooms/videos'),
    # Users / Roles / Permissions
    ('GET', '/api/users'),
    ('GET', '/api/roles'),
    ('GET', '/api/permissions'),
    ('GET', '/api/departments'),
    # Video / Cameras / IoT / GB28181
    ('GET', '/api/video/devices'),
    ('GET', '/api/cameras/list'),
    ('GET', '/api/iot-devices'),
    ('GET', '/api/iot-devices/stats'),
    ('GET', '/api/gb28181-devices'),
    # Maintenance
    ('GET', '/api/work-orders/list'),
    ('GET', '/api/maint-records/list'),
    ('GET', '/api/maint-contracts/list'),
    ('GET', '/api/maintenance/work-orders'),
    ('GET', '/api/maintenance/stats'),
    # Patrol / Hazards / Plans / Drills
    ('GET', '/api/patrol-plans/list'),
    ('GET', '/api/patrol-records/list'),
    ('GET', '/api/hazards/list'),
    ('GET', '/api/patrol/plans'),
    ('GET', '/api/patrol/records'),
    ('GET', '/api/patrol/hazards'),
    ('GET', '/api/plans/list'),
    ('GET', '/api/drills/list'),
    # Inspections / Documents / Knowledge
    ('GET', '/api/inspections/list'),
    ('GET', '/api/documents/list'),
    ('GET', '/api/knowledge'),
    ('GET', '/api/knowledge/categories'),
    # Notifications / Duty
    ('GET', '/api/notifications/list'),
    ('GET', '/api/notifications/unread'),
    ('GET', '/api/duty-schedules/list'),
    ('GET', '/api/duty-shifts/list'),
    ('GET', '/api/duty-handovers/list'),
    ('GET', '/api/duty/schedules'),
    ('GET', '/api/duty/logs'),
    ('GET', '/api/duty/current'),
    # System / Logs / Reports
    ('GET', '/api/system-logs/list'),
    ('GET', '/api/system/logs'),
    ('GET', '/api/system/config'),
    ('GET', '/api/system/dashboard'),
    ('GET', '/api/reports/list'),
    # Bigscreen / Monitor / Analysis
    ('GET', '/api/bigscreen/data'),
    ('GET', '/api/monitor/overview'),
    ('GET', '/api/analysis/device'),
    ('GET', '/api/analysis/alarm'),
    ('GET', '/api/analysis/maintenance'),
    ('GET', '/api/analysis/hazard'),
    ('GET', '/api/analysis/patrol'),
    # Personnel / SIP / DB / Floor plans
    ('GET', '/api/personnel/list'),
    ('GET', '/api/sip-server/status'),
    ('GET', '/api/db/stats'),
    ('GET', '/api/floor-plans/list'),
    ('GET', '/api/floor-devices/list'),
    ('GET', '/api/alarm-snapshots/list'),
    ('GET', '/api/control-room-configs/list'),
    # Training / AI
    ('GET', '/api/training/courses'),
    ('GET', '/api/training/exams'),
    ('GET', '/api/ai/decisions'),
    ('GET', '/api/ai/alerts'),
    # Linkage
    ('GET', '/api/linkage-rules/list'),
    ('GET', '/api/linkage-records/list'),
]

print('=== Final Comprehensive API Health Check ===')
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
        msg = data.get('msg', data.get('message', '?'))[:40]
    except:
        biz_code = '?'
        msg = resp[:50]
    
    ok = (code == '200' and biz_code == 200)
    if ok:
        ok_count += 1
        status = 'OK'
    else:
        fail_count += 1
        status = f'FAIL(http={code},biz={biz_code})'
        failures.append((path, code, biz_code, msg))
    print(f'{status} {method} {path}')

print(f'\n=== Final Summary: {ok_count} OK, {fail_count} FAIL ===')
if failures:
    print('\n=== Remaining Failures ===')
    for path, code, biz, msg in failures:
        print(f'{path}: HTTP={code}, biz={biz}, msg={msg}')
else:
    print('\n✅ ALL APIs PASS - 所有页面 API 均已可用')

# Check service status
stdin, stdout, stderr = client.exec_command('pm2 status fire-api')
print('\n=== PM2 Status ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
