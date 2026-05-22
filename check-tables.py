import subprocess, os
env = os.environ.copy()
env['PGPASSWORD'] = 'fire_password_2024'
r = subprocess.run(['psql', '-h', 'localhost', '-U', 'fire_user', '-d', 'fire_platform', '-c', '\\dt'], capture_output=True, text=True, env=env)
print(r.stdout)
print(r.stderr)
