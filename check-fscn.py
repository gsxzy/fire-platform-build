import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
url = 'http://localhost:6041/rest/sql/fire_platform_ts'
r = requests.post(url, data=b"SELECT tbname, COUNT(*) FROM stb_raw_log WHERE protocol_type='fscn8001' GROUP BY tbname;", headers=h, allow_redirects=True)
print('fscn8001 subtables:', r.json())
r = requests.post(url, data=b"SELECT COUNT(*) FROM ctb_raw_fscn8001_8C0000000000000000000000;", headers=h, allow_redirects=True)
print('ctb_raw_fscn8001_8C0000000000000000000000:', r.json())
