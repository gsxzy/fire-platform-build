import type { IoTDevice } from './types';

export function resolveArchiveDeviceId(d: IoTDevice): number {
  const id = d.archive_device_id ?? d.id;
  return Number(id);
}

export function mapDeviceStatus(status: string, onlineStatus: string): string {
  const s = (status || '').toLowerCase();
  const os = (onlineStatus || '').toLowerCase();
  if (s === 'disabled' || s === 'scrapped') return 'offline';
  if (s === 'fault' || s === 'maintenance') return 'fault';
  if (os === 'offline' || s === 'offline') return 'offline';
  if (os === 'online' || s === 'normal') return 'running';
  return 'stopped';
}

export function mapDeviceType(protocol: string, name: string): string {
  const p = (protocol || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (n.includes('风机')) return 'fan';
  if (n.includes('泵')) return 'pump';
  if (n.includes('阀')) return 'valve';
  if (n.includes('广播')) return 'broadcast';
  if (n.includes('卷帘')) return 'shutter';
  if (n.includes('电梯')) return 'elevator';
  if (n.includes('照明') || n.includes('指示')) return 'lighting';
  if (p === 'gb26875' || p === 'fscn8001') return 'controller';
  return 'controller';
}

export const CMD_MAP: Record<string, string> = {
  '启动': 'start',
  '停止': 'stop',
  '测试': 'test',
  '复位': 'reset',
  '消音': 'mute',
  '手动': 'manual',
  '自动': 'auto',
};

export const CMD_LABEL: Record<string, string> = {
  start: '启动', stop: '停止', test: '测试', reset: '复位',
  mute: '消音', manual: '手动模式', auto: '自动模式',
};
