import subprocess, json, time

# Update device stream_mode
subprocess.run([
    'docker', 'exec', 'wvp-mysql', 'mysql', '-uroot', '-pwvp@2024', '-P3307', 'wvp', '-e',
    "UPDATE wvp_device SET stream_mode='TCP-PASSIVE' WHERE device_id='34020000001320000002';"
])

# Login
subprocess.run([
    'curl', '-s', '-G', 'http://localhost:18080/api/user/login',
    '--data-urlencode', 'username=admin',
    '--data-urlencode', 'password=21232f297a57a5a743894a0e4a801fc3',
    '-o', '/tmp/wvp_login5.json'
])

# Start tcpdump in background
subprocess.Popen([
    'timeout', '45', 'tcpdump', '-i', 'any', '-nn', '-s0', '-w', '/tmp/play_single.pcap',
    'udp port 5060 or tcp port 10000 or tcp port 10003 or udp port 10000 or udp port 10003'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Get token and play
d = json.load(open('/tmp/wvp_login5.json'))
token = d['data']['accessToken']

result = subprocess.run([
    'curl', '-s', '-m', '35',
    '-H', 'access-token: ' + token,
    'http://localhost:18080/api/play/start/34020000001320000002/34020000001320000002'
], capture_output=True, text=True)
print('Play response:', result.stdout)
