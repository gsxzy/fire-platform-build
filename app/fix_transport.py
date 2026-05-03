import subprocess

# Check what transport was originally - try TCP
sql = "UPDATE wvp_device SET transport='TCP', local_ip='124.223.35.58' WHERE device_id='34020000001320000002';"
cmd = ['docker', 'exec', 'wvp-mysql', 'mysql', '-uroot', '-pwvp@2024', '-P3307', 'wvp', '-e', sql]
r = subprocess.run(cmd, capture_output=True, text=True)
print('Update:', r.stdout)
if r.stderr:
    print('ERR:', r.stderr)

sql2 = "SELECT device_id, transport, stream_mode, local_ip, ip, port FROM wvp_device WHERE device_id='34020000001320000002';"
cmd2 = ['docker', 'exec', 'wvp-mysql', 'mysql', '-uroot', '-pwvp@2024', '-P3307', 'wvp', '-e', sql2]
r2 = subprocess.run(cmd2, capture_output=True, text=True)
print(r2.stdout)
