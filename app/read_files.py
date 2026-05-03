import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')

files = [
    'src/sections/LoginPage.tsx',
    'src/sections/Footer.tsx',
    'src/api/client.ts',
    'src/sections/FireMonitorPage.tsx',
    'src/sections/GISMapPage.tsx'
]

for f in files:
    try:
        sftp = ssh.open_sftp()
        try:
            data = sftp.file(f, 'r').read().decode('utf-8', 'ignore')
            with open(f.replace('/', '_').replace('src_', ''), 'w', encoding='utf-8') as out:
                out.write(data)
            print(f"Read {f}: {len(data)} chars")
        except:
            print(f"Not found: {f}")
        sftp.close()
    except Exception as e:
        print(f"Error {f}: {e}")

ssh.close()
print('done')
