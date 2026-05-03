#!/usr/bin/env python3
"""Deploy dist to server via SFTP."""
import os
import sys
import paramiko
import tarfile
import io

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_DIR = "/www/wwwroot/fire-platform"
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

def deploy():
    if not os.path.isdir(DIST_DIR):
        print(f"ERROR: {DIST_DIR} not found. Run `npm run build` first.")
        sys.exit(1)

    # Create tar archive in memory
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, dirs, files in os.walk(DIST_DIR):
            for f in files:
                local_path = os.path.join(root, f)
                arcname = os.path.relpath(local_path, DIST_DIR)
                tar.add(local_path, arcname=arcname)
    buf.seek(0)
    tar_bytes = buf.read()
    print(f"Packed dist ({len(tar_bytes)} bytes)")

    # SSH connect
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    try:
        # Backup old dist
        backup_cmd = f"cp -r {REMOTE_DIR} {REMOTE_DIR}.bak.$(date +%Y%m%d%H%M%S)"
        client.exec_command(backup_cmd)
        print("Backup created")

        # Clean old backups (keep last 3)
        clean_cmd = f"cd $(dirname {REMOTE_DIR}) && ls -1td $(basename {REMOTE_DIR}).bak.* 2>/dev/null | tail -n +4 | xargs -r rm -rf"
        client.exec_command(clean_cmd)
        print("Old backups cleaned (keep last 3)")

        # Upload tar
        remote_tar = f"/tmp/fire-platform-dist.tar.gz"
        with sftp.file(remote_tar, "wb") as f:
            f.write(tar_bytes)
        print("Uploaded archive")

        # Extract on remote
        cmds = [
            f"rm -rf {REMOTE_DIR}/*",
            f"tar -xzf {remote_tar} -C {REMOTE_DIR}",
            f"rm -f {remote_tar}",
        ]
        for cmd in cmds:
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            if out:
                print(f"  > {out}")
            if err:
                print(f"  ! {err}")

        # Check nginx cache config in vhost file
        vhost_conf = "/www/server/nginx/conf/vhost/fire-platform.conf"
        try:
            with sftp.file(vhost_conf, "r") as f:
                content = f.read().decode()
            if "no-cache" in content and ".html" in content:
                print("  > Nginx cache config already exists in vhost")
            else:
                print("  ! Nginx cache config missing in vhost, manual check needed")
        except Exception as e:
            print(f"  ! Nginx vhost check error: {e}")

        # Reload nginx
        stdin, stdout, stderr = client.exec_command("nginx -t && nginx -s reload")
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(f"  > {out}")
        if err:
            print(f"  ! {err}")

        print("\nDeployment completed successfully!")
    finally:
        sftp.close()
        client.close()

if __name__ == "__main__":
    deploy()
