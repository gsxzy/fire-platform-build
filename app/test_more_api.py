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
        return resp.status, resp.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='replace')
    except Exception as e:
        return -1, str(e)

# 登录
status, body = fetch('http://124.223.35.58/api/auth/login', method='POST', body={'username': 'admin', 'password': 'admin123'})
data = json.loads(body)
token = data['data'].get('accessToken') or data['data'].get('token')
auth = {'Authorization': f'Bearer {token}'}

# 测试更多 API
apis = [
    ('GET', '/api/alarms/list?pageSize=1', 'Alarms List'),
    ('GET', '/api/alarms/1/detail', 'Alarm Detail'),
    ('GET', '/api/alarms/recent', 'Alarms Recent'),
    ('GET', '/api/control-rooms/hosts?roomId=CR-001', 'CR Hosts by Room'),
    ('GET', '/api/control-rooms/hosts/1', 'CR Host Detail'),
    ('GET', '/api/control-rooms/realtime?roomId=CR-001', 'CR Realtime'),
    ('GET', '/api/control-rooms/videos', 'CR Videos'),
    ('GET', '/api/dashboard/stats', 'Dashboard'),
    ('GET', '/api/dashboard/subsystems', 'Dashboard Subsystems'),
    ('GET', '/api/fire-hosts?pageSize=1', 'Fire Hosts'),
    ('GET', '/api/cameras?pageSize=1', 'Cameras'),
    ('GET', '/api/devices?pageSize=1', 'Devices'),
    ('GET', '/api/iot-devices?pageSize=1', 'IoT Devices'),
    ('GET', '/api/users?pageSize=1', 'Users'),
]

for method, path, name in apis:
    status, body = fetch(f'http://124.223.35.58{path}', method=method, headers=auth)
    icon = 'OK' if status == 200 else f'ERR({status})'
    snippet = body[:100] if len(body) > 100 else body
    print(f'  [{icon}] {name:25s} → {snippet}')
