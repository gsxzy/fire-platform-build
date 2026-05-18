import subprocess

for tbl in ['todos', 'notices', 'notifications']:
    r = subprocess.run(
        ['mysql', '-uroot', '-pZhangcong2255', 'fire_platform', '-e', f'DESC {tbl}'],
        capture_output=True, text=True
    )
    print(f'=== {tbl} ===')
    print(r.stdout)
    print()
