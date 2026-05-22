import subprocess, os
env = os.environ.copy()
env['PGPASSWORD'] = 'fire_password_2024'
r = subprocess.run(['psql', '-h', 'localhost', '-U', 'fire_user', '-d', 'fire_platform', '-c', "SELECT tablename, (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count FROM ( SELECT tablename, query_to_xml('SELECT COUNT(*) AS cnt FROM ' || quote_ident(tablename), false, true, '') AS xml_count FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'fire_%' ) t ORDER BY row_count DESC LIMIT 15;"], capture_output=True, text=True, env=env)
print(r.stdout)
