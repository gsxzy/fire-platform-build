import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

statements = [
    # Drop and recreate JT tables properly
    "DROP TABLE IF EXISTS wvp_jt_terminal;",
    """CREATE TABLE wvp_jt_terminal (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(50),
        terminal_id VARCHAR(50),
        province_id VARCHAR(50),
        province_text VARCHAR(100),
        city_id VARCHAR(50),
        city_text VARCHAR(100),
        maker_id VARCHAR(50),
        model VARCHAR(50),
        plate_color VARCHAR(50),
        plate_no VARCHAR(50),
        longitude DOUBLE,
        latitude DOUBLE,
        status BOOL DEFAULT FALSE,
        register_time VARCHAR(50) DEFAULT NULL,
        update_time VARCHAR(50) NOT NULL,
        create_time VARCHAR(50) NOT NULL,
        geo_coord_sys VARCHAR(50),
        media_server_id VARCHAR(50) DEFAULT 'auto',
        sdp_ip VARCHAR(50),
        CONSTRAINT uk_jt_device_id_device_id UNIQUE (id, phone_number)
    );""",
    "DROP TABLE IF EXISTS wvp_jt_channel;",
    """CREATE TABLE wvp_jt_channel (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        terminal_db_id BIGINT,
        channel_id INT,
        has_audio BOOL DEFAULT FALSE,
        name VARCHAR(255),
        update_time VARCHAR(50) NOT NULL,
        create_time VARCHAR(50) NOT NULL,
        CONSTRAINT uk_jt_channel_id_device_id UNIQUE (terminal_db_id, channel_id)
    );""",
    # Add missing columns
    "ALTER TABLE wvp_media_server ADD COLUMN IF NOT EXISTS jtt_proxy_port INT;",
    "ALTER TABLE wvp_media_server ADD COLUMN IF NOT EXISTS mp4_port INT;",
    "ALTER TABLE wvp_media_server ADD COLUMN IF NOT EXISTS mp4_ssl_port INT;",
    "ALTER TABLE wvp_device_channel ADD COLUMN IF NOT EXISTS enable_broadcast INT DEFAULT 0;",
    "ALTER TABLE wvp_device_channel ADD COLUMN IF NOT EXISTS map_level INT DEFAULT 0;",
    "ALTER TABLE wvp_common_group ADD COLUMN IF NOT EXISTS alias VARCHAR(255) DEFAULT NULL;",
]

for sql in statements:
    stdin, stdout, stderr = client.exec_command(f"cat > /tmp/alt.sql << 'EOF'\n{sql}\nEOF")
    stdin, stdout, stderr = client.exec_command(
        "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/alt.sql 2>&1"
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if out and 'Warning' not in out:
        print(f"SQL: {sql[:60]}... -> {out}")
    else:
        print(f"SQL: {sql[:60]}... -> OK")

client.close()
