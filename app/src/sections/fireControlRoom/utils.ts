import type { MultilinePoint, BusPoint } from './types';

export const SECONDARY_PWD = import.meta.env.VITE_SECONDARY_VERIFY_PWD || '';

export function fmtTime(t?: string): string {
  if (!t) return '-';
  const d = new Date(t.replace(' ', 'T'));
  if (isNaN(d.getTime())) return t.slice(5, 16);
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${M}-${D} ${h}:${m}`;
}

export function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function generateDefaultMultiline(hostId?: number): MultilinePoint[] {
  const hid = hostId || 1;
  return [
    { id: hid * 10 + 1, host_id: hid, point_no: 1, point_name: '喷淋泵启动', device_type: '喷淋泵', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hid * 10 + 2, host_id: hid, point_no: 2, point_name: '消防泵启动', device_type: '消防泵', status: 1, feedback_status: 1, fault_status: 0 },
    { id: hid * 10 + 3, host_id: hid, point_no: 3, point_name: '排烟风机启动', device_type: '排烟风机', status: 0, feedback_status: 0, fault_status: 1 },
    { id: hid * 10 + 4, host_id: hid, point_no: 4, point_name: '正压送风机启动', device_type: '正压送风机', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hid * 10 + 5, host_id: hid, point_no: 5, point_name: '消防广播', device_type: '广播设备', status: 0, feedback_status: 0, fault_status: 0 },
  ];
}

export function generateDefaultBusPoints(hostId?: number): BusPoint[] {
  const hid = hostId || 1;
  const locations = ['1F大厅', '2F走廊', 'B1停车场', '天台', '配电室'];
  const deviceTypes = ['烟感探测器', '温感探测器', '手动报警按钮', '输入输出模块'];
  return Array.from({ length: 16 }, (_, i) => ({
    id: hid * 100 + i + 1,
    host_id: hid,
    loop_no: Math.floor(i / 8) + 1,
    point_no: (i % 8) + 1,
    point_name: `回路${Math.floor(i / 8) + 1}_点位${(i % 8) + 1}`,
    device_type: deviceTypes[i % 4],
    install_location: locations[i % 5],
    status: i < 2 ? 1 : i < 4 ? 2 : 0,
  }));
}
