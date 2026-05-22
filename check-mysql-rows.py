import subprocess
# Check MySQL table row counts
r = subprocess.run(['ssh', '-o', 'StrictHostKeyChecking=no', '-i', 'C:\\Users\\Huawei\\.ssh\\id_ed25519', 'root@124.223.35.58',
    'mysql -u root -pZhangcong2255 -N -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = \\\'fire_platform\\\' AND table_rows > 0 ORDER BY table_rows DESC LIMIT 20;"'],
    capture_output=True, text=True)
print(r.stdout)
if r.stderr: print('STDERR:', r.stderr)
