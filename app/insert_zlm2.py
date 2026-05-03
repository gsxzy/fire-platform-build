import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

sql = (
    "INSERT INTO wvp_media_server (id, ip, hook_ip, sdp_ip, stream_ip, http_port, http_ssl_port, "
    "rtmp_port, rtmp_ssl_port, rtp_proxy_port, rtsp_port, rtsp_ssl_port, flv_port, flv_ssl_port, "
    "ws_flv_port, ws_flv_ssl_port, auto_config, secret, type, rtp_enable, rtp_port_range, "
    "send_rtp_port_range, record_assist_port, default_server, create_time, update_time, "
    "hook_alive_interval, record_path, record_day, server_id) "
    "VALUES ('zlm-local', '124.223.35.58', '124.223.35.58', '124.223.35.58', '124.223.35.58', "
    "8081, 0, 10001, 0, 10003, 10002, 0, 8081, 0, 8081, 0, "
    "0, 'clKwNbLRJ1LgJ6xPcmd767mVX5xn5tgz', 'zlm', 1, '40000,40036', '50000,55000', "
    "0, 1, NOW(), NOW(), 10, './www/record', 7, 'polaris');"
)

# Write SQL to file and execute
stdin, stdout, stderr = client.exec_command(f"cat > /tmp/insert_zlm.sql << 'EOF'\n{sql}\nEOF")
print("Write:", stdout.channel.recv_exit_status())

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/insert_zlm.sql 2>&1"
)
out = stdout.read().decode('utf-8', errors='replace')
print("Result:", out)

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SELECT id,ip,http_port,default_server FROM wvp_media_server;' wvp 2>&1"
)
print("Verify:", stdout.read().decode('utf-8', errors='replace'))

client.close()
