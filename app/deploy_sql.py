import paramiko

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
DB = 'fire_platform'

def exec_sql(client, sql):
    cmd = f"mysql -u root {DB} -e \"{sql}\""
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

def column_exists(client, table, col):
    cmd = f"mysql -u root -N -B -e \"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='{DB}' AND TABLE_NAME='{table}' AND COLUMN_NAME='{col}';\""
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    return out == '1'

def table_exists(client, table):
    cmd = f"mysql -u root -N -B -e \"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='{DB}' AND TABLE_NAME='{table}';\""
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    return out == '1'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    # 1. 扩展 units 表
    unit_cols = [
        ('contact_name', "VARCHAR(64) DEFAULT NULL COMMENT '联系人姓名'"),
        ('contact_phone', "VARCHAR(20) DEFAULT NULL COMMENT '联系人电话'"),
        ('contact_email', "VARCHAR(64) DEFAULT NULL COMMENT '联系人邮箱'"),
        ('legal_person', "VARCHAR(64) DEFAULT NULL COMMENT '法人姓名'"),
        ('license_no', "VARCHAR(64) DEFAULT NULL COMMENT '统一社会信用代码'"),
        ('area', "DECIMAL(10,2) DEFAULT NULL COMMENT '占地面积(㎡)'"),
        ('lng', "DECIMAL(10,7) DEFAULT NULL COMMENT '经度'"),
        ('lat', "DECIMAL(10,7) DEFAULT NULL COMMENT '纬度'"),
        ('risk_level', "VARCHAR(16) DEFAULT 'low' COMMENT '风险等级'"),
        ('supervision_level', "VARCHAR(16) DEFAULT 'general' COMMENT '监管等级'"),
        ('parent_id', "VARCHAR(32) DEFAULT NULL COMMENT '上级单位ID'"),
        ('remark', "TEXT DEFAULT NULL COMMENT '备注'"),
    ]

    for col, defn in unit_cols:
        if not column_exists(client, 'units', col):
            sql = f"ALTER TABLE units ADD COLUMN {col} {defn}"
            out, err = exec_sql(client, sql)
            print(f"  ADD {col}: {err or 'OK'}")
        else:
            print(f"  {col} already exists")

    # 同步 supervision_level
    out, err = exec_sql(client, "UPDATE units SET supervision_level = type WHERE supervision_level IS NULL OR supervision_level = '';")
    print(f"  UPDATE supervision_level: {err or 'OK'}")

    # 2. 创建设备档案表
    if not table_exists(client, 'device_archive'):
        sql = """CREATE TABLE device_archive (
          id VARCHAR(32) PRIMARY KEY COMMENT '平台统一设备ID',
          code VARCHAR(64) UNIQUE NOT NULL COMMENT '设备编码（一物一码）',
          name VARCHAR(128) NOT NULL COMMENT '设备名称',
          category VARCHAR(32) NOT NULL COMMENT '设备类别',
          sub_category VARCHAR(32) DEFAULT NULL COMMENT '子类别',
          manufacturer VARCHAR(64) DEFAULT NULL COMMENT '制造商',
          model VARCHAR(64) DEFAULT NULL COMMENT '型号',
          serial_no VARCHAR(64) DEFAULT NULL COMMENT '出厂序列号',
          production_date DATE DEFAULT NULL COMMENT '生产日期',
          install_date DATE DEFAULT NULL COMMENT '安装日期',
          expire_date DATE DEFAULT NULL COMMENT '有效期至',
          unit_id VARCHAR(32) DEFAULT NULL COMMENT '所属单位',
          building_id VARCHAR(32) DEFAULT NULL COMMENT '所属建筑',
          floor_id VARCHAR(32) DEFAULT NULL COMMENT '所属楼层',
          area VARCHAR(64) DEFAULT NULL COMMENT '区域/位置描述',
          lng DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
          lat DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
          protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型',
          protocol_device_id VARCHAR(64) DEFAULT NULL COMMENT '关联协议层设备ID',
          ip VARCHAR(64) DEFAULT NULL COMMENT 'IP地址',
          port INT DEFAULT NULL COMMENT '端口号',
          status VARCHAR(16) DEFAULT 'normal' COMMENT '档案状态',
          health_score INT DEFAULT 100 COMMENT '设备健康度 0-100',
          qr_code VARCHAR(255) DEFAULT NULL COMMENT '一物一码二维码URL',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_unit_id (unit_id),
          INDEX idx_building_id (building_id),
          INDEX idx_floor_id (floor_id),
          INDEX idx_category (category),
          INDEX idx_status (status),
          INDEX idx_protocol_device (protocol_device_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备档案总台账（一物一码）'"""
        out, err = exec_sql(client, sql)
        print(f"  CREATE device_archive: {err or 'OK'}")
    else:
        print("  device_archive already exists")

    # 添加外键（如果表刚创建）
    if table_exists(client, 'device_archive'):
        fk_checks = [
            ("fk_da_unit", "ALTER TABLE device_archive ADD CONSTRAINT fk_da_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL"),
            ("fk_da_building", "ALTER TABLE device_archive ADD CONSTRAINT fk_da_building FOREIGN KEY (building_id) REFERENCES fire_building(id) ON DELETE SET NULL"),
            ("fk_da_floor", "ALTER TABLE device_archive ADD CONSTRAINT fk_da_floor FOREIGN KEY (floor_id) REFERENCES fire_floor(id) ON DELETE SET NULL"),
        ]
        for fk_name, fk_sql in fk_checks:
            cmd = f"mysql -u root -N -B -e \"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='{DB}' AND TABLE_NAME='device_archive' AND CONSTRAINT_NAME='{fk_name}';\""
            stdin, stdout, stderr = client.exec_command(cmd)
            if stdout.read().decode('utf-8', errors='replace').strip() != '1':
                out, err = exec_sql(client, fk_sql)
                print(f"  ADD FK {fk_name}: {err or 'OK'}")

    # 3. 创建设备配置表
    if not table_exists(client, 'device_config'):
        sql = """CREATE TABLE device_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
          protocol_type VARCHAR(16) DEFAULT NULL COMMENT '协议类型',
          communication_params JSON DEFAULT NULL COMMENT '通信参数',
          alarm_thresholds JSON DEFAULT NULL COMMENT '告警阈值配置',
          linkage_rules JSON DEFAULT NULL COMMENT '联动规则',
          heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔秒',
          data_collection_interval INT DEFAULT 300 COMMENT '数据采集间隔秒',
          auto_report TINYINT(1) DEFAULT 1,
          mute_enabled TINYINT(1) DEFAULT 1,
          reset_enabled TINYINT(1) DEFAULT 1,
          remote_control_enabled TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_device_id (device_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备配置'"""
        out, err = exec_sql(client, sql)
        print(f"  CREATE device_config: {err or 'OK'}")
    else:
        print("  device_config already exists")

    # 4. 创建设备维护表
    if not table_exists(client, 'device_maintenance'):
        sql = """CREATE TABLE device_maintenance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(32) NOT NULL COMMENT '关联设备档案ID',
          type VARCHAR(16) NOT NULL COMMENT '维护类型：inspection巡检/maintenance维保/repair维修',
          plan_date DATE NOT NULL COMMENT '计划日期',
          actual_date DATE DEFAULT NULL COMMENT '实际执行日期',
          executor VARCHAR(64) DEFAULT NULL COMMENT '执行人',
          cost DECIMAL(10,2) DEFAULT NULL COMMENT '费用',
          content TEXT DEFAULT NULL COMMENT '维护内容',
          result VARCHAR(16) DEFAULT NULL COMMENT '结果：pass通过/fail未通过/na不适用',
          status VARCHAR(16) DEFAULT 'pending' COMMENT '状态',
          next_plan_date DATE DEFAULT NULL COMMENT '下次计划日期',
          attachments JSON DEFAULT NULL COMMENT '附件列表',
          created_by VARCHAR(64) DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_device_id (device_id),
          INDEX idx_plan_date (plan_date),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维护记录'"""
        out, err = exec_sql(client, sql)
        print(f"  CREATE device_maintenance: {err or 'OK'}")
    else:
        print("  device_maintenance already exists")

    # 5. 创建单位人员表
    if not table_exists(client, 'unit_personnel'):
        sql = """CREATE TABLE unit_personnel (
          id INT AUTO_INCREMENT PRIMARY KEY,
          unit_id VARCHAR(32) NOT NULL COMMENT '所属单位',
          name VARCHAR(64) NOT NULL COMMENT '姓名',
          role VARCHAR(32) NOT NULL COMMENT '角色',
          phone VARCHAR(20) DEFAULT NULL,
          email VARCHAR(64) DEFAULT NULL,
          is_primary TINYINT(1) DEFAULT 0 COMMENT '是否主要责任人',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_unit_id (unit_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位人员/责任体系'"""
        out, err = exec_sql(client, sql)
        print(f"  CREATE unit_personnel: {err or 'OK'}")
    else:
        print("  unit_personnel already exists")

    print("\nDatabase migration completed!")
finally:
    client.close()
