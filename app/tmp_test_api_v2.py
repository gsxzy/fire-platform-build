import urllib.request
import json
req = urllib.request.Request(
    'http://127.0.0.1:5002/api/auth/login',
    data=json.dumps({'username':'admin','password':'admin'}).encode(),
    headers={'Content-Type':'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode())
except Exception as e:
    print(e)
