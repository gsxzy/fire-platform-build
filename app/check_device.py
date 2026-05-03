import subprocess
sql = "SELECT * FROM wvp_device WHERE device_id='34020000001320000002';"
cmd = ['docker', 'exec', 'wvp-mysql', 'mysql', '-uroot', '-pwvp@2024', '-P3307', 'wvp', '-e', sql]
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stdout)
if r.stderr:
    print('ERR:', r.stderr)
