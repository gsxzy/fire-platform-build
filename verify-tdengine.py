import requests, base64
auth = base64.b64encode(b'root:taosdata').decode()
h = {'Authorization': f'Basic {auth}', 'Content-Type': 'text/plain'}
url = 'http://localhost:6041/rest/sql/fire_platform_ts'

queries = [
    "SELECT COUNT(*) FROM stb_raw_log;",
    "SELECT COUNT(*) FROM stb_telemetry;",
    "SELECT protocol_type, COUNT(*) FROM stb_raw_log GROUP BY protocol_type;",
    "SELECT FIRST(ts), LAST(ts) FROM stb_raw_log;",
]
for q in queries:
    r = requests.post(url, data=q.encode('utf-8'), headers=h, allow_redirects=True)
    print(q)
    print(r.json())
    print()
