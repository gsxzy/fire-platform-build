import { Flame, AlertTriangle, Shield, Bell, Radio } from 'lucide-react';
import type { DutyRecord, ProcessStep } from './types';

export function generateProcess(alarmStatus: string): ProcessStep[] {
  const st = alarmStatus || 'new';
  return [
    { label: '已接警', desc: '发生报警值守人员进行报警', completed: true, active: false },
    { label: '电话拨打', desc: '拨打单位/场所相关人员电话进行火警通知', completed: st !== 'new', active: st === 'new' },
    { label: '电话再次确认', desc: '若未进行火警确认则三分钟后继续电话确认', completed: st === 'confirmed' || st === 'handled' || st === 'ignored', active: st === 'handling' },
    { label: '值守确认', desc: '填写经与现场值守确认信息', completed: st === 'confirmed' || st === 'handled' || st === 'ignored', active: false },
  ];
}

export function generateDutyRecords(detail: any): DutyRecord[] {
  const unitName = detail.unit_name || detail.unit?.unit_name || '未知单位';
  const deviceName = detail.device_name || '未知设备';
  const st = detail.status;
  const handler = detail.handler_name || detail.handler || '-';
  const createdAt = detail.createdAt || '-';
  return [
    { stage: '接警', person: '系统', time: createdAt, action: `接到${unitName}${deviceName}报警`, completed: true },
    { stage: '通知', person: '系统', time: '-', action: '拨打单位值班电话通知火警', completed: st !== 'new' },
    { stage: '确认', person: handler, time: detail.confirm_time || '-', action: '现场值守人员确认报警信息', completed: st === 'confirmed' || st === 'handled' || st === 'ignored' },
    { stage: '处置', person: handler, time: detail.handle_time || '-', action: st === 'confirmed' ? '确认为真实火警，启动应急预案' : st === 'ignored' ? '确认为误报，记录归档' : '等待处理', completed: st === 'handled' || st === 'ignored' },
  ];
}

export function getStatusInfo(status: string | number) {
  const s = String(status).toLowerCase();
  if (s === 'new' || s === '0') return { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (s === 'confirmed' || s === '1') return { label: '已确认', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (s === 'handled' || s === '2') return { label: '已处理', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (s === 'ignored' || s === '3') return { label: '已忽略', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  return { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

export function getAlarmTypeInfo(type: string | number) {
  const t = String(type).toLowerCase();
  if (t === 'fire' || t === '1') return { label: '火警', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Flame };
  if (t === 'fault' || t === '2') return { label: '故障', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle };
  if (t === 'warning' || t === '3') return { label: '预警', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Shield };
  if (t === 'supervisory' || t === '4') return { label: '监管', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Bell };
  return { label: '未知', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Radio };
}
