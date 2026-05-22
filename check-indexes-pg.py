import subprocess, os
env = os.environ.copy()
env['PGPASSWORD'] = 'fire_password_2024'
r = subprocess.run(['psql', '-h', 'localhost', '-U', 'fire_user', '-d', 'fire_platform', '-c', "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%_idx' ORDER BY tablename, indexname;"], capture_output=True, text=True, env=env)
print(r.stdout)
if r.stderr: print('STDERR:', r.stderr)
