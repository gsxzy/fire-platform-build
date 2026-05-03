/* ═══════════════════════════════════════════════════════════════
   报警主机 / 回路 / 设备点位 类型定义
   ═══════════════════════════════════════════════════════════════ */

/** 报警主机 */
export interface FireHost {
  id: number;
  deviceId?: string;          // 关联通用设备档案ID
  hostCode: string;
  brand: string;
  model: string;
  ip: string;
  port: number;
  location: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 回路 */
export interface FireLoop {
  id: number;
  hostId: number;
  loopNo: number;
  loopName: string;
  status: number;
  createdAt?: string;
}

/** 设备点位 */
export interface FireDevice {
  id: number;
  hostId: number;
  loopNo: number;
  address: number;
  deviceType: string;
  location: string;
  remark: string;
  status: number;
  createdAt?: string;
}

/** 分页响应 */
export interface PaginatedList<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
