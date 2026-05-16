'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // CTWing 原始推送日志表
    await queryInterface.createTable('ctwing_raw_log', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      device_id: { type: DataTypes.STRING(100), allowNull: false },
      msg_type: { type: DataTypes.STRING(32) },
      raw_json: { type: DataTypes.JSON },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', comment: 'CTWing原始推送日志' });
    await queryInterface.addIndex('ctwing_raw_log', ['device_id'], { name: 'idx_device_id' });
    await queryInterface.addIndex('ctwing_raw_log', ['created_at'], { name: 'idx_created_at' });

    // ISNB 遥测数据表
    await queryInterface.createTable('iot_telemetry', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      iot_device_id: { type: DataTypes.BIGINT, allowNull: false },
      message_id: { type: DataTypes.INTEGER },
      message_type: { type: DataTypes.STRING(32) },
      dev_type: { type: DataTypes.INTEGER },
      dev_type_name: { type: DataTypes.STRING(64) },
      imei: { type: DataTypes.STRING(32) },
      device_model: { type: DataTypes.STRING(64) },
      rsrp: { type: DataTypes.INTEGER },
      snr: { type: DataTypes.INTEGER },
      shield: { type: DataTypes.INTEGER },
      channel_count: { type: DataTypes.INTEGER },
      pressure_kpa: { type: DataTypes.DECIMAL(10, 2) },
      level_m: { type: DataTypes.DECIMAL(10, 2) },
      temperature: { type: DataTypes.DECIMAL(10, 1) },
      battery_pct: { type: DataTypes.INTEGER },
      has_alarm: { type: DataTypes.TINYINT, defaultValue: 0 },
      has_fault: { type: DataTypes.TINYINT, defaultValue: 0 },
      raw_hex: { type: DataTypes.TEXT },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', comment: 'IoT遥测数据' });
    await queryInterface.addIndex('iot_telemetry', ['iot_device_id'], { name: 'idx_iot_device_id' });
    await queryInterface.addIndex('iot_telemetry', ['created_at'], { name: 'idx_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('iot_telemetry');
    await queryInterface.dropTable('ctwing_raw_log');
  },
};
