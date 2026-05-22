import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
url = 'http://localhost:6041/rest/sql/fire_platform_ts'

r = requests.post(url, data=b"SELECT tbname, COUNT(*) FROM stb_raw_log WHERE protocol_type='fscn8001' GROUP BY tbname;", headers=h, allow_redirects=True)
data = r.json()
total = 0
for row in data.get('data', []):
    print(row[0], row[1])
    total += row[1]
print('Total:', total)
