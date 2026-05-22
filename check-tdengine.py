import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
r = requests.post('http://localhost:6041/rest/sql/fire_platform_ts', data='SHOW STABLES;', headers=h, allow_redirects=True)
print('STABLES:', r.json())
r = requests.post('http://localhost:6041/rest/sql/fire_platform_ts', data='SHOW TABLES;', headers=h, allow_redirects=True)
print('TABLES:', r.json())
