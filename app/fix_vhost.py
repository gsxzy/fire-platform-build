import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
CONF = "/www/server/nginx/conf/vhost/fire-platform.conf"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read current config
stdin, stdout, stderr = client.exec_command(f"cat {CONF}")
conf = stdout.read().decode()
print("Current vhost config:")
print(conf)

# Check if already has cache control for index.html
if "Cache-Control" in conf and "index.html" in conf:
    print("\nCache control for index.html already exists")
else:
    # Add cache control location block
    new_block = """    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

"""
    marker = "    location / {"
    if marker in conf:
        conf = conf.replace(marker, new_block + marker)
        # Write back
        stdin, stdout, stderr = client.exec_command(f"cat > {CONF} << 'EOF'\n{conf}\nEOF")
        err = stderr.read().decode().strip()
        if err:
            print(f"Write error: {err}")
        else:
            print("\nVhost config updated")
    else:
        print("\nCould not find insertion point")

# Test and reload
stdin, stdout, stderr = client.exec_command("nginx -t && nginx -s reload")
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out:
    print(f"> {out}")
if err:
    print(f"! {err}")

client.close()
