import subprocess, os
env = os.environ.copy()
env['PGPASSWORD'] = 'fire_password_2024'
r = subprocess.run(['psql', '-h', 'localhost', '-U', 'fire_user', '-d', 'fire_platform', '-c', "SELECT schemaname, tablename, pg_catalog.pg_total_relation_size('\"' || schemaname || '\".\"' || tablename || '\"') AS size FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'fire_%' ORDER BY pg_total_relation_size('\"' || schemaname || '\".\"' || tablename || '\"') DESC LIMIT 10;"], capture_output=True, text=True, env=env)
print(r.stdout)
