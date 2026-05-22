import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
url = 'http://localhost:6041/rest/sql/fire_platform_ts'

# Check all tables
r = requests.post(url, data=b"SHOW TABLES;", headers=h, allow_redirects=True)
for row in r.json().get('data', []):
    if 'fscn' in row[0].lower() or 'gb26875' in row[0].lower():
        print(row[0])
