/**
 * ═══════════════════════════════════════════════════════════════════
 * UI 工具库 — 统一状态映射、徽章样式、动画工具
 * 消除各页面重复定义 statusMap / typeMap / severityMap 的问题
 * ═══════════════════════════════════════════════════════════════════
 */

import type { LucideIcon } from 'lucide-react';
import { Flame, AlertTriangle, Shield, CheckCircle, Bell, Info, XCircle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   告警状态统一映射
   ───────────────────────────────────────────────────────────────── */
export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon?: LucideIcon;
  glow?: string;
}

export const alarmStatusMap: Record<string, StatusMeta> = {
  new:       { label: '待处理', color: 'text-red-400',      bg: 'bg-red-500/10',      border: 'border-red-500/20',      icon: Bell,         glow: 'shadow-red-500/10' },
  confirmed: { label: '已确认', color: 'text-blue-400',     bg: 'bg-blue-500/10',     border: 'border-blue-500/20',     icon: CheckCircle,  glow: 'shadow-blue-500/10' },
  handled:   { label: '已处理', color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20',  icon: CheckCircle,  glow: 'shadow-emerald-500/10' },
  ignored:   { label: '已忽略', color: 'text-slate-400',    bg: 'bg-slate-500/10',    border: 'border-slate-500/20',    icon: XCircle,      glow: 'shadow-slate-500/10' },
};

export const alarmTypeMap: Record<string, StatusMeta> = {
  fire:        { label: '火警',   color: 'text-red-400',      bg: 'bg-red-500/10',      border: 'border-red-500/20',      icon: Flame,        glow: 'shadow-red-500/10' },
  fault:       { label: '故障',   color: 'text-yellow-400',   bg: 'bg-yellow-500/10',   border: 'border-yellow-500/20',   icon: AlertTriangle, glow: 'shadow-yellow-500/10' },
  warning:     { label: '预警',   color: 'text-purple-400',   bg: 'bg-purple-500/10',   border: 'border-purple-500/20',   icon: Shield,        glow: 'shadow-purple-500/10' },
  supervisory: { label: '监管',   color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20',  icon: CheckCircle,   glow: 'shadow-emerald-500/10' },
  test:        { label: '测试',   color: 'text-slate-400',    bg: 'bg-slate-500/10',    border: 'border-slate-500/20',    icon: Info,          glow: 'shadow-slate-500/10' },
};

export const severityMap: Record<string, StatusMeta> = {
  urgent: { label: '紧急', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'shadow-red-500/10' },
  high:   { label: '高',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glow: 'shadow-orange-500/10' },
  normal: { label: '一般', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'shadow-blue-500/10' },
  low:    { label: '低',   color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   glow: 'shadow-slate-500/10' },
};

/* 设备在线状态 */
export const deviceOnlineMap: Record<string, StatusMeta> = {
  online:  { label: '在线',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  offline: { label: '离线',  color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   glow: 'shadow-slate-500/10' },
  fault:   { label: '故障',  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'shadow-red-500/10' },
  warning: { label: '预警',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  glow: 'shadow-yellow-500/10' },
};

/* 通用布尔状态 */
export const booleanStatusMap = (activeLabel = '启用', inactiveLabel = '禁用') => ({
  true:  { label: activeLabel,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  false: { label: inactiveLabel, color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
  1:     { label: activeLabel,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  0:     { label: inactiveLabel, color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
});

/* ─────────────────────────────────────────────────────────────────
   工具函数
   ───────────────────────────────────────────────────────────────── */

/** 安全获取状态元数据 */
export function getStatusMeta(
  map: Record<string, StatusMeta>,
  key: string | number | undefined | null,
  fallback: StatusMeta = { label: '未知', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
): StatusMeta {
  if (key == null) return fallback;
  return map[String(key)] ?? map[String(key).toLowerCase()] ?? fallback;
}

/** 生成阶梯延迟样式（用于列表项入场动画） */
export function staggerDelay(index: number, base = 0.05): React.CSSProperties {
  return { animationDelay: `${index * base}s`, animationFillMode: 'both' };
}

/** 数字滚动格式化 */
export function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}

/** 时间友好显示 */
export function timeAgo(date: string | Date | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/** 生成 Tailwind 类名字符串（过滤 falsy 值） */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
