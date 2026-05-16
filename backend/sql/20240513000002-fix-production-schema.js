'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // ── 1. fire_unit 补齐缺失字段 ──
    const unitColumns = await queryInterface.describeTable('fire_unit');
    if (!unitColumns.contact_email) {
      await queryInterface.addColumn('fire_unit', 'contact_email', {
        type: DataTypes.STRING(100),
        after: 'contact_phone',
      });
    }
    if (!unitColumns.legal_person) {
      await queryInterface.addColumn('fire_unit', 'legal_person', {
        type: DataTypes.STRING(50),
        after: 'contact_email',
      });
    }
    if (!unitColumns.license_no) {
      await queryInterface.addColumn('fire_unit', 'license_no', {
        type: DataTypes.STRING(64),
        after: 'legal_person',
      });
    }

    // ── 2. fire_device 补齐缺失字段 ──
    const deviceColumns = await queryInterface.describeTable('fire_device');
    if (!deviceColumns.remark) {
      await queryInterface.addColumn('fire_device', 'remark', { type: DataTypes.TEXT, after: 'point_id' });
    }
    if (!deviceColumns.config) {
      await queryInterface.addColumn('fire_device', 'config', { type: DataTypes.TEXT, after: 'remark' });
    }
    if (!deviceColumns.online_status) {
      await queryInterface.addColumn('fire_device', 'online_status', {
        type: DataTypes.TINYINT, defaultValue: 0, after: 'config',
      });
    }
    if (!deviceColumns.calibration_cycle) {
      await queryInterface.addColumn('fire_device', 'calibration_cycle', {
        type: DataTypes.INTEGER, after: 'online_status',
      });
    }
    if (!deviceColumns.scrap_year) {
      await queryInterface.addColumn('fire_device', 'scrap_year', {
        type: DataTypes.INTEGER, after: 'calibration_cycle',
      });
    }
    if (!deviceColumns.gateway_id) {
      await queryInterface.addColumn('fire_device', 'gateway_id', {
        type: DataTypes.STRING(100), after: 'scrap_year',
      });
    }

    // ── 3. 数据一致性修复 ──
    await queryInterface.sequelize.query(
      "UPDATE fire_device SET lifecycle_status = 1 WHERE lifecycle_status IS NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE fire_device SET status = 1 WHERE status IS NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE fire_unit SET unit_type = 1 WHERE unit_type IS NULL"
    );
    await queryInterface.sequelize.query(
      "UPDATE fire_unit SET fire_level = 1 WHERE fire_level IS NULL"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('fire_device', 'gateway_id');
    await queryInterface.removeColumn('fire_device', 'scrap_year');
    await queryInterface.removeColumn('fire_device', 'calibration_cycle');
    await queryInterface.removeColumn('fire_device', 'online_status');
    await queryInterface.removeColumn('fire_device', 'config');
    await queryInterface.removeColumn('fire_device', 'remark');
    await queryInterface.removeColumn('fire_unit', 'license_no');
    await queryInterface.removeColumn('fire_unit', 'legal_person');
    await queryInterface.removeColumn('fire_unit', 'contact_email');
  },
};
