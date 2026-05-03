import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url, method='GET', headers=None, body=None, timeout=10):
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('User-Agent', 'Mozilla/5.0')
        req.add_header('Accept', 'application/json')
        req.add_header('Content-Type', 'application/json')
        if headers:
            for k, v in headers.items():
                req.add_header(k, v)
        if body:
            req.data = json.dumps(body).encode('utf-8')
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read()) if e.fp else {}
    except Exception as e:
        return -1, str(e)

# 登录
status, data = fetch('http://124.223.35.58/api/auth/login', method='POST', body={'username': 'admin', 'password': 'admin123'})
token = data.get('data', {}).get('token')
auth = {'Authorization': 'Bearer ' + token}

print('=== FINAL API VERIFICATION ===')
all_ok = True
apis = [
    ('/api/health', 'Health', 200),
    ('/api/workbench', 'Workbench', 200),
    ('/api/alarms?pageSize=1', 'Alarms', 200),
    ('/api/alarms/list?pageSize=1', 'Alarms List', 200),
    ('/api/alarms/stats', 'Alarms Stats', 200),
    ('/api/alarms/recent', 'Alarms Recent', 200),
    ('/api/alarms/1/detail', 'Alarm Detail', 200),
    ('/api/control-rooms?pageSize=1', 'Control Rooms', 200),
    ('/api/control-rooms/hosts', 'CR Hosts', 200),
    ('/api/control-rooms/hosts?roomId=CR-001', 'CR Hosts CR-001', 200),
    ('/api/control-rooms/hosts/1', 'CR Host Detail', 200),
    ('/api/control-rooms/realtime?roomId=CR-001', 'CR Realtime', 200),
    ('/api/control-rooms/videos', 'CR Videos', 200),
    ('/api/dashboard/stats', 'Dashboard', 200),
    ('/api/dashboard/subsystems', 'Dashboard Sub', 200),
    ('/api/fire-hosts?pageSize=1', 'Fire Hosts', 200),
    ('/api/cameras?pageSize=1', 'Cameras', 200),
    ('/api/devices?pageSize=1', 'Devices', 200),
    ('/api/iot-devices?pageSize=1', 'IoT Devices', 200),
    ('/api/users?pageSize=1', 'Users', 200),
]

for path, name, expect in apis:
    status, body = fetch('http://124.223.35.58' + path, headers=auth)
    ok = status == expect
    if not ok:
        all_ok = False
    icon = 'OK' if ok else f'ERR({status})'
    print(f'  [{icon}] {name:25s}')

print()
if all_ok:
    print('ALL APIs PASSED')
else:
    print('SOME APIs FAILED')
