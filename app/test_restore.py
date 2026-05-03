import json, subprocess, time

# Login
subprocess.run([
    'curl', '-s', '-G', 'http://localhost:18080/api/user/login',
    '--data-urlencode', 'username=admin',
    '--data-urlencode', 'password=21232f297a57a5a743894a0e4a801fc3',
    '-o', '/tmp/wvp_login6.json'
])

# Start tcpdump
subprocess.Popen([
    'timeout', '45', 'tcpdump', '-i', 'any', '-nn', '-s0', '-w', '/tmp/play_restored2.pcap',
    'udp port 5060 or tcp port 10000 or tcp port 10003'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Play
d = json.load(open('/tmp/wvp_login6.json'))
token = d['data']['accessToken']

result = subprocess.run([
    'curl', '-s', '-m', '35',
    '-H', 'access-token: ' + token,
    'http://localhost:18080/api/play/start/34020000001320000002/34020000001320000002'
], capture_output=True, text=True)
print('Play response:', result.stdout)
