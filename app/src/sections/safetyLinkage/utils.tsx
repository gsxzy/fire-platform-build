import {
  CheckCircle, XCircle, AlertTriangle,
  Link2, Flame, Activity, BrainCircuit, DoorOpen, Users, Droplets, Shield,
  Video, Bell, Camera, Zap, Play, Wrench,
} from 'lucide-react';
import { linkageService } from '@/api/services';
import type { LinkageRule } from './types';

export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapUiActionLabel(label: string): { deviceId: number; command: string; params: Record<string, unknown> } {
  if (label.includes('门禁') || label.includes('释放')) {
    return { deviceId: 0, command: 'unlock', params: { description: label } };
  }
  if (label.includes('广播') || label.includes('119')) {
    return { deviceId: 0, command: 'broadcast', params: { description: label } };
  }
  if (label.includes('电梯') || label.includes('归首')) {
    return { deviceId: 0, command: 'floor1', params: { description: label } };
  }
  if (label.includes('电源') || label.includes('强切')) {
    return { deviceId: 0, command: 'power_off', params: { description: label } };
  }
  return { deviceId: 0, command: 'notify', params: { uiAction: label } };
}

export function uiActionsToDb(actions: string[]) {
  const devices: number[] = [];
  const commands: { command: string; params: Record<string, unknown>; delay: number }[] = [];
  let delayAcc = 0;
  const stepSec = 1;
  for (const label of actions) {
    const m = mapUiActionLabel(label);
    devices.push(m.deviceId);
    commands.push({ command: m.command, params: m.params, delay: delayAcc });
    delayAcc += stepSec;
  }
  return {
    action_devices: JSON.stringify(devices),
    action_commands: JSON.stringify(commands),
  };
}

export function buildTriggerCondition(form: Partial<LinkageRule>): string {
  return JSON.stringify({
    version: 2,
    type: form.type,
    trigger: form.trigger,
    triggerDesc: form.triggerDesc,
    priority: form.priority,
    timeRange: form.timeRange,
    units: form.units,
    deviceTypes: form.deviceTypes ?? [],
    targets: form.targets ?? [],
    description: form.description ?? '',
    actions: form.actions ?? [],
    alarmTypes: form.alarmTypes ?? [],
  });
}

export function ruleToDbPayload(form: LinkageRule): Record<string, unknown> {
  const ac = uiActionsToDb(form.actions);
  const tid = form.triggerDeviceId?.trim();
  return {
    rule_name: form.name,
    trigger_type: 1,
    trigger_device_id: tid ? Number(tid) : null,
    trigger_condition: buildTriggerCondition(form),
    action_devices: ac.action_devices,
    action_commands: ac.action_commands,
    status: form.enabled ? 1 : 0,
  };
}

export function deriveActionsFromCommands(row: { action_commands?: string }): string[] {
  const cmds = safeParseJson<Array<{ params?: { uiAction?: string; description?: string } }>>(row.action_commands, []);
  const out = cmds
    .map((c) => (c.params?.uiAction || c.params?.description || '').trim())
    .filter(Boolean);
  return out;
}

export function rowToRule(row: Record<string, unknown>): LinkageRule {
  const cond = safeParseJson<Partial<LinkageRule> & { actions?: string[]; alarmTypes?: number[] }>(
    row.trigger_condition as string,
    {},
  );
  const acts =
    Array.isArray(cond.actions) && cond.actions.length > 0
      ? cond.actions
      : deriveActionsFromCommands(row as { action_commands?: string });
  const tid = row.trigger_device_id;
  return {
    id: String(row.id ?? ''),
    name: (row.rule_name as string) || cond.name || '未命名',
    type: cond.type || 'fire-video',
    trigger: cond.trigger || '',
    triggerDesc: cond.triggerDesc || '',
    actions: acts,
    targets: cond.targets || [],
    enabled: row.status === 1,
    priority: (cond.priority as LinkageRule['priority']) || 'medium',
    timeRange: cond.timeRange || '00:00-23:59',
    units: cond.units?.length ? (cond.units as string[]) : ['全部单位'],
    deviceTypes: cond.deviceTypes || [],
    lastTriggered: '-',
    triggerCount: 0,
    description: cond.description || '',
    triggerDeviceId: tid != null && tid !== '' ? String(tid) : '',
    alarmTypes: Array.isArray(cond.alarmTypes) ? cond.alarmTypes : [],
  };
}

export async function fetchAllLinkageRules(): Promise<Record<string, unknown>[]> {
  const pageSize = 100;
  let pageNum = 1;
  const all: Record<string, unknown>[] = [];
  for (;;) {
    const data = (await linkageService.listRules({ pageNum, pageSize })) as { list?: Record<string, unknown>[] };
    const list = data?.list ?? [];
    all.push(...list);
    if (list.length < pageSize) break;
    pageNum += 1;
    if (pageNum > 50) break;
  }
  return all;
}

export const priorityCfg = (p: string) => {
  switch (p) {
    case 'high': return { label: '高', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    case 'medium': return { label: '中', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    case 'low': return { label: '低', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
    default: return { label: '中', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  }
};

export const resultCfg = (r: string) => {
  switch (r) {
    case 'success': return { label: '成功', color: 'text-emerald-400', icon: CheckCircle };
    case 'partial': return { label: '部分成功', color: 'text-yellow-400', icon: AlertTriangle };
    case 'fail': return { label: '失败', color: 'text-red-400', icon: XCircle };
    default: return { label: r, color: 'text-slate-400', icon: XCircle };
  }
};

export const typeIcon = (type: string) => {
  switch (type) {
    case 'fire-video': return <Flame className="w-4 h-4 text-red-400" />;
    case 'fault-video': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'feedback': return <Activity className="w-4 h-4 text-blue-400" />;
    case 'ai-recognition': return <BrainCircuit className="w-4 h-4 text-purple-400" />;
    case 'blockage': return <DoorOpen className="w-4 h-4 text-orange-400" />;
    case 'vacancy': return <Users className="w-4 h-4 text-pink-400" />;
    case 'water-low': return <Droplets className="w-4 h-4 text-cyan-400" />;
    case 'key-area': return <Shield className="w-4 h-4 text-red-400" />;
    default: return <Link2 className="w-4 h-4 text-slate-400" />;
  }
};

export const actionIcon = (action: string) => {
  if (action.includes('视频')) return <Video className="w-3 h-3 text-blue-400" />;
  if (action.includes('弹窗')) return <Bell className="w-3 h-3 text-yellow-400" />;
  if (action.includes('录像')) return <Camera className="w-3 h-3 text-purple-400" />;
  if (action.includes('AI')) return <BrainCircuit className="w-3 h-3 text-cyan-400" />;
  if (action.includes('工单')) return <Wrench className="w-3 h-3 text-orange-400" />;
  if (action.includes('推送')) return <Zap className="w-3 h-3 text-green-400" />;
  if (action.includes('预警') || action.includes('告警')) return <AlertTriangle className="w-3 h-3 text-red-400" />;
  if (action.includes('抓拍')) return <Camera className="w-3 h-3 text-indigo-400" />;
  if (action.includes('预案')) return <Shield className="w-3 h-3 text-red-400" />;
  if (action.includes('广播')) return <Bell className="w-3 h-3 text-pink-400" />;
  if (action.includes('门禁')) return <DoorOpen className="w-3 h-3 text-blue-400" />;
  return <Play className="w-3 h-3 text-slate-400" />;
};

export const ALARM_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '火警' },
  { value: 2, label: '故障' },
  { value: 3, label: '预警' },
  { value: 4, label: '屏蔽' },
  { value: 5, label: '其他' },
];

export const RULE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'fire-video', label: '火警视频联动' },
  { value: 'fault-video', label: '故障视频联动' },
  { value: 'feedback', label: '反馈联动' },
  { value: 'ai-recognition', label: 'AI 识别' },
  { value: 'blockage', label: '通道堵塞' },
  { value: 'vacancy', label: '离岗监测' },
  { value: 'water-low', label: '水位/水压' },
  { value: 'key-area', label: '重点区域' },
];
