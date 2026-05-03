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

# 1. 登录获取 token
status, body = fetch('http://124.223.35.58/api/auth/login', method='POST', body={
    'username': 'admin',
    'password': 'admin123'
})
print(f'Login: HTTP {status}')
if status != 200:
    print(body[:500])
    exit()

data = json.loads(body)
token = data.get('data', {}).get('accessToken') or data.get('data', {}).get('token')
if not token:
    print('No token in response:', body[:500])
    exit()
print(f'Token: {token[:30]}...')

auth_header = {'Authorization': f'Bearer {token}'}

# 2. 测试各个 API
apis = [
    ('GET', '/api/alarms/list?pageSize=5', 'Alarms List'),
    ('GET', '/api/alarms/stats', 'Alarms Stats'),
    ('GET', '/api/control-rooms?pageSize=5', 'Control Rooms'),
    ('GET', '/api/control-rooms/hosts', 'Control Room Hosts'),
    ('GET', '/api/dashboard/stats', 'Dashboard Stats'),
    ('GET', '/api/devices?pageSize=5', 'Devices'),
    ('GET', '/api/cameras?pageSize=5', 'Cameras'),
]

for method, path, name in apis:
    status, body = fetch(f'http://124.223.35.58{path}', method=method, headers=auth_header)
    icon = 'OK' if status == 200 else f'ERR({status})'
    print(f'  [{icon}] {name:25s} → {body[:120]}')
