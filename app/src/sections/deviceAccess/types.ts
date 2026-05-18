export interface IoTDevice {
  /** 展示用设备编码（与档案 id / device_sn 一致） */
  id: string;
  /** fire_device.id */
  archiveDeviceId?: string;
  /** fire_iot_device 主键，用于更新、删除 */
  dbId: string;
  deviceSn: string;
  deviceNo: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  unitId: string;
  protocol: string;
  ip?: string;
  port?: string;
  imei?: string;
  location: string;
  floor: string;
  room: string;
  status: 'online' | 'offline' | 'fault' | 'warning' | 'maintaining';
  lastHeartbeat: string;
  heartbeatInterval: number;
  dataPoints: number;
  alarmCount: number;
  faultCount: number;
  registerCount: number;
  firmware: string;
  manufacturer: string;
  model: string;
  installDate: string;
  productionDate: string;
  warrantyPeriod: number;
  warrantyExpire: string;
  maintenanceExpire: string;
  isBound: boolean;
  /** CTWing MQTT 接入配置（存储在 protocol_config 中） */
  protocolConfig?: {
    productId?: string;
    ctwingDeviceId?: string;
    ctwingPassword?: string;
    broker?: string;
    keepalive?: number;
    thresholds?: Record<string, unknown>;
  };
}
