'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 复合索引：入库管理列表高频查询
    await queryInterface.addIndex('fire_device', ['lifecycle_status', 'created_at'], {
      name: 'idx_lifecycle_created',
    });

    // 复合索引：设备编号/名称/SN 联合搜索
    await queryInterface.addIndex('fire_device', ['device_no', 'device_name', 'device_sn'], {
      name: 'idx_device_search',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('fire_device', 'idx_device_search');
    await queryInterface.removeIndex('fire_device', 'idx_lifecycle_created');
  },
};
