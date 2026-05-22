import requests

url = 'http://localhost:6041/rest/sql/fire_platform_ts'
auth = ('root', 'taosdata')

for p in ['fscn8001', 'gb26875', 'ctwing']:
    sql = f"SELECT count(*) FROM stb_raw_log WHERE protocol_type = '{p}'"
    r = requests.post(url, data=sql, auth=auth)
    data = r.json()
    cnt = data.get('data', [[0]])[0][0] if 'data' in data else 0
    print(f'{p}: {cnt}')
