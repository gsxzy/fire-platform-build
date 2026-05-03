import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_DIR = "/opt/my-fire-api"

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    try:
        # Upload SQL file
        local_path = "sql/device_archive_tables.sql"
        remote_path = f"{REMOTE_DIR}/device_archive_tables.sql"
        sftp.put(local_path, remote_path)
        print(f"Uploaded {local_path}")

        # Execute SQL
        stdin, stdout, stderr = client.exec_command(
            f"mysql -u root -D fire_platform -e 'source {remote_path}' 2>&1 || echo 'MySQL command failed'"
        )
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8', errors='replace')
        err_output = stderr.read().decode('utf-8', errors='replace')
        print("SQL execution output:")
        print(output)
        if err_output.strip():
            print("SQL stderr:")
            print(err_output)

        if exit_status == 0:
            print("Database tables created successfully!")
        else:
            print(f"SQL execution failed with exit code {exit_status}")

    finally:
        sftp.close()
        client.close()

if __name__ == '__main__':
    deploy()
