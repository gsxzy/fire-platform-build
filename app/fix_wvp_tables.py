import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

sql = """CREATE TABLE IF NOT EXISTS wvp_jt_terminal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    phone_number VARCHAR(50) COMMENT '终端SIM卡号',
    terminal_id VARCHAR(50) COMMENT '终端设备ID',
    province_id VARCHAR(50) COMMENT '所在省份ID',
    province_text VARCHAR(100) COMMENT '所在省份名称',
    city_id VARCHAR(50) COMMENT '所在城市ID',
    city_text VARCHAR(100) COMMENT '所在城市名称',
    maker_id VARCHAR(50) COMMENT '厂商ID',
    model VARCHAR(50) COMMENT '终端型号',
    plate_color VARCHAR(50) COMMENT '车牌颜色',
    plate_no VARCHAR(50) COMMENT '车牌号码',
    longitude DOUBLE COMMENT '经度',
    latitude DOUBLE COMMENT '纬度',
    status BOOL DEFAULT FALSE COMMENT '在线状态',
    register_time VARCHAR(50) DEFAULT NULL COMMENT '注册时间',
    update_time VARCHAR(50) NOT NULL COMMENT '更新时间',
    create_time VARCHAR(50) NOT NULL COMMENT '创建时间',
    geo_coord_sys VARCHAR(50) COMMENT '坐标系',
    media_server_id VARCHAR(50) DEFAULT 'auto' COMMENT '媒体服务器ID',
    sdp_ip VARCHAR(50) COMMENT 'SDP IP',
    CONSTRAINT uk_jt_device_id_device_id UNIQUE (id, phone_number)
);

CREATE TABLE IF NOT EXISTS wvp_jt_channel (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    terminal_db_id BIGINT COMMENT '所属终端记录ID',
    channel_id INT COMMENT '通道号',
    has_audio BOOL DEFAULT FALSE COMMENT '是否有音频',
    status BOOL DEFAULT FALSE COMMENT '在线状态',
    register_time VARCHAR(50) DEFAULT NULL COMMENT '注册时间',
    update_time VARCHAR(50) NOT NULL COMMENT '更新时间',
    create_time VARCHAR(50) NOT NULL COMMENT '创建时间'
);
"""

stdin, stdout, stderr = client.exec_command("cat > /tmp/fix.sql << 'EOF'\n" + sql + "EOF")
print("Write:", stdout.channel.recv_exit_status())

stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp < /tmp/fix.sql 2>&1"
)
print("Result:", stdout.read().decode('utf-8', errors='replace'))

# Verify tables
stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SHOW TABLES LIKE \"wvp_jt_%\";' wvp 2>&1"
)
print("Tables:", stdout.read().decode('utf-8', errors='replace'))

client.close()
