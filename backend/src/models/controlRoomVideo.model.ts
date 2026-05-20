import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export const ControlRoomVideo = sequelize.define('control_room_video', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '消控室ID' },
  camera_name: { type: DataTypes.STRING(100), comment: '摄像头名称' },
  camera_no: { type: DataTypes.STRING(50), comment: '摄像头编号' },
  stream_url: { type: DataTypes.STRING(500), comment: '视频流地址' },
  protocol: { type: DataTypes.STRING(20), defaultValue: 'HLS', comment: '协议' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0离线 1在线' },
  position: { type: DataTypes.STRING(200), comment: '安装位置' },
  sort_order: { type: DataTypes.TINYINT, defaultValue: 0, comment: '排序' },
}, {
  tableName: 'control_room_video',
  timestamps: true,
  underscored: true,
  comment: '消控室视频监控关联表',
  indexes: [
    { name: 'idx_room_id', fields: ['room_id'] },
    { name: 'idx_status', fields: ['status'] },
    { name: 'uk_room_camera', fields: ['room_id', 'camera_no'], unique: true },
  ],
});
