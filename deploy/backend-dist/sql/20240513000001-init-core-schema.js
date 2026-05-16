'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // ── 1. 组织架构 ──
    await queryInterface.createTable('sys_department', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      dept_name: { type: DataTypes.STRING(100), allowNull: false },
      parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
      sort: { type: DataTypes.INTEGER, defaultValue: 0 },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 2. 用户 ──
    await queryInterface.createTable('sys_user', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      real_name: { type: DataTypes.STRING(50) },
      phone: { type: DataTypes.STRING(20) },
      email: { type: DataTypes.STRING(100) },
      avatar: { type: DataTypes.STRING(255) },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      dept_id: { type: DataTypes.BIGINT.UNSIGNED },
      last_login: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 3. 角色 ──
    await queryInterface.createTable('sys_role', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      role_name: { type: DataTypes.STRING(50), allowNull: false },
      role_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255) },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      sort: { type: DataTypes.INTEGER, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 4. 权限 ──
    await queryInterface.createTable('sys_permission', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      perm_name: { type: DataTypes.STRING(50), allowNull: false },
      perm_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1菜单 2按钮' },
      parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
      sort: { type: DataTypes.INTEGER, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 5. 用户角色关联 ──
    await queryInterface.createTable('sys_user_role', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('sys_user_role', ['user_id', 'role_id'], { unique: true, name: 'uk_user_role' });

    // ── 6. 角色权限关联 ──
    await queryInterface.createTable('sys_role_permission', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      perm_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('sys_role_permission', ['role_id', 'perm_id'], { unique: true, name: 'uk_role_perm' });

    // ── 7. 单位 ──
    await queryInterface.createTable('fire_unit', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      unit_name: { type: DataTypes.STRING(200), allowNull: false },
      unit_code: { type: DataTypes.STRING(50), unique: true },
      unit_type: { type: DataTypes.TINYINT, defaultValue: 1 },
      address: { type: DataTypes.STRING(255) },
      lng: { type: DataTypes.DECIMAL(10, 7) },
      lat: { type: DataTypes.DECIMAL(10, 7) },
      contact_name: { type: DataTypes.STRING(50) },
      contact_phone: { type: DataTypes.STRING(20) },
      contact_email: { type: DataTypes.STRING(100) },
      legal_person: { type: DataTypes.STRING(50) },
      license_no: { type: DataTypes.STRING(64) },
      building_area: { type: DataTypes.INTEGER },
      floor_count: { type: DataTypes.INTEGER },
      fire_level: { type: DataTypes.TINYINT, defaultValue: 1 },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('fire_unit', ['unit_code'], { name: 'idx_unit_code' });
    await queryInterface.addIndex('fire_unit', ['unit_type'], { name: 'idx_unit_type' });
    await queryInterface.addIndex('fire_unit', ['fire_level'], { name: 'idx_fire_level' });

    // ── 8. 设备档案 ──
    await queryInterface.createTable('fire_device', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      device_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      device_sn: { type: DataTypes.STRING(100) },
      device_name: { type: DataTypes.STRING(200), allowNull: false },
      device_type: { type: DataTypes.STRING(50) },
      device_model: { type: DataTypes.STRING(100) },
      manufacturer: { type: DataTypes.STRING(100) },
      unit_id: { type: DataTypes.BIGINT.UNSIGNED },
      unit_name: { type: DataTypes.STRING(200) },
      install_location: { type: DataTypes.STRING(255) },
      floor: { type: DataTypes.STRING(20) },
      point_id: { type: DataTypes.STRING(50) },
      remark: { type: DataTypes.TEXT },
      config: { type: DataTypes.TEXT },
      online_status: { type: DataTypes.TINYINT, defaultValue: 0 },
      calibration_cycle: { type: DataTypes.INTEGER },
      scrap_year: { type: DataTypes.INTEGER },
      gateway_id: { type: DataTypes.STRING(100) },
      install_date: { type: DataTypes.DATEONLY },
      warranty_expire: { type: DataTypes.DATEONLY },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      lifecycle_status: { type: DataTypes.TINYINT, defaultValue: 1 },
      last_online: { type: DataTypes.DATE },
      protocol_type: { type: DataTypes.STRING(50) },
      iot_id: { type: DataTypes.STRING(100) },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('fire_device', ['device_sn'], { name: 'idx_device_sn' });
    await queryInterface.addIndex('fire_device', ['lifecycle_status'], { name: 'idx_lifecycle_status' });

    // ── 9. IoT 设备 ──
    await queryInterface.createTable('fire_iot_device', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      device_sn: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      device_name: { type: DataTypes.STRING(200) },
      device_type: { type: DataTypes.STRING(50) },
      protocol_type: { type: DataTypes.STRING(50) },
      protocol_config: { type: DataTypes.TEXT },
      status: { type: DataTypes.TINYINT, defaultValue: 0 },
      unit_id: { type: DataTypes.BIGINT.UNSIGNED },
      archive_device_id: { type: DataTypes.BIGINT.UNSIGNED },
      ip_address: { type: DataTypes.STRING(50) },
      last_online: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('fire_iot_device', ['unit_id'], { name: 'idx_iot_unit_id' });

    // ── 10. 告警 ──
    await queryInterface.createTable('fire_alarm', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      alarm_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      alarm_type: { type: DataTypes.TINYINT, allowNull: false, comment: '1火警 2故障 3反馈' },
      alarm_level: { type: DataTypes.TINYINT, defaultValue: 1 },
      device_id: { type: DataTypes.BIGINT.UNSIGNED },
      device_name: { type: DataTypes.STRING(200) },
      unit_id: { type: DataTypes.BIGINT.UNSIGNED },
      unit_name: { type: DataTypes.STRING(200) },
      location: { type: DataTypes.STRING(255) },
      alarm_desc: { type: DataTypes.TEXT },
      status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1处理中 2已处理 3已关闭' },
      handler_name: { type: DataTypes.STRING(50) },
      handle_time: { type: DataTypes.DATE },
      handle_result: { type: DataTypes.TEXT },
      protocol: { type: DataTypes.STRING(50) },
      raw_data: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('fire_alarm', ['created_at'], { name: 'idx_created_at' });

    // ── 11. 消控室 ──
    await queryInterface.createTable('fire_control_room', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      room_name: { type: DataTypes.STRING(200) },
      unit_id: { type: DataTypes.BIGINT.UNSIGNED },
      unit_name: { type: DataTypes.STRING(200) },
      host_model: { type: DataTypes.STRING(100) },
      host_no: { type: DataTypes.STRING(50) },
      loop_count: { type: DataTypes.INTEGER },
      device_count: { type: DataTypes.INTEGER },
      duty_person: { type: DataTypes.STRING(50) },
      duty_phone: { type: DataTypes.STRING(20) },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    await queryInterface.addIndex('fire_control_room', ['unit_id'], { name: 'idx_cr_unit_id' });

    // ── 12. 维保单位 ──
    await queryInterface.createTable('maintenance_company', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      company_name: { type: DataTypes.STRING(200), allowNull: false },
      credit_code: { type: DataTypes.STRING(50) },
      legal_person: { type: DataTypes.STRING(50) },
      contact_phone: { type: DataTypes.STRING(20) },
      address: { type: DataTypes.STRING(255) },
      qualification_level: { type: DataTypes.STRING(20) },
      status: { type: DataTypes.TINYINT, defaultValue: 1 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 13. 系统配置 ──
    await queryInterface.createTable('sys_config', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      config_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      config_value: { type: DataTypes.TEXT },
      description: { type: DataTypes.STRING(255) },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // ── 14. 刷新令牌表 ──
    await queryInterface.createTable('sys_refresh_tokens', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      token: { type: DataTypes.TEXT, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
  },

  async down(queryInterface) {
    const tables = [
      'sys_refresh_tokens',
      'sys_config',
      'maintenance_company',
      'fire_control_room',
      'fire_alarm',
      'fire_iot_device',
      'fire_device',
      'fire_unit',
      'sys_role_permission',
      'sys_user_role',
      'sys_permission',
      'sys_role',
      'sys_user',
      'sys_department',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
