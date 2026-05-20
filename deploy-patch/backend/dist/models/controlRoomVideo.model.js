"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlRoomVideo = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
exports.ControlRoomVideo = database_1.default.define('control_room_video', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    room_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '消控室ID' },
    camera_name: { type: sequelize_1.DataTypes.STRING(100), comment: '摄像头名称' },
    camera_no: { type: sequelize_1.DataTypes.STRING(50), comment: '摄像头编号' },
    stream_url: { type: sequelize_1.DataTypes.STRING(500), comment: '视频流地址' },
    protocol: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'HLS', comment: '协议' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0离线 1在线' },
    position: { type: sequelize_1.DataTypes.STRING(200), comment: '安装位置' },
    sort_order: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '排序' },
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
//# sourceMappingURL=controlRoomVideo.model.js.map