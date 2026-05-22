import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
url = 'http://localhost:6041/rest/sql/fire_platform_ts'

for pt in ['fscn8001', 'gb26875', 'ctwing']:
    r = requests.post(url, data=f"SELECT COUNT(*) FROM stb_raw_log WHERE protocol_type='{pt}';".encode('utf-8'), headers=h, allow_redirects=True)
    print(f'{pt}:', r.json().get('data', [[0]])[0][0])

r = requests.post(url, data=b"SELECT COUNT(*) FROM stb_telemetry;", headers=h, allow_redirects=True)
print('telemetry:', r.json().get('data', [[0]])[0][0])
