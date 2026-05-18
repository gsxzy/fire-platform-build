import {
  Fan, Droplets, ArrowUpDown, Speaker, ScrollText, Cpu, Zap, CircleDot,
} from 'lucide-react';

export const typeConfig = (type: string) => {
  switch (type) {
    case 'fan': return { label: '风机', icon: Fan, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', gradient: 'from-cyan-500 to-blue-500' };
    case 'pump': return { label: '水泵', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', gradient: 'from-blue-500 to-indigo-500' };
    case 'valve': return { label: '阀门', icon: ArrowUpDown, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', gradient: 'from-indigo-500 to-purple-500' };
    case 'broadcast': return { label: '广播', icon: Speaker, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', gradient: 'from-purple-500 to-pink-500' };
    case 'shutter': return { label: '防火卷帘', icon: ScrollText, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', gradient: 'from-orange-500 to-red-500' };
    case 'elevator': return { label: '电梯', icon: Cpu, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', gradient: 'from-pink-500 to-rose-500' };
    case 'lighting': return { label: '应急照明', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', gradient: 'from-yellow-500 to-orange-500' };
    case 'controller': return { label: '控制器', icon: CircleDot, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', gradient: 'from-emerald-500 to-teal-500' };
    default: return { label: '设备', icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', gradient: 'from-slate-500 to-slate-400' };
  }
};

export const statusConfig = (status: string) => {
  switch (status) {
    case 'running': return { label: '在线', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', ring: 'ring-emerald-500/30' };
    case 'stopped': return { label: '停止', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500', ring: 'ring-slate-500/20' };
    case 'fault': return { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400', ring: 'ring-red-500/30' };
    case 'offline': return { label: '离线', color: 'text-slate-600', bg: 'bg-slate-600/10', dot: 'bg-slate-600', ring: 'ring-slate-600/20' };
    default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500', ring: 'ring-slate-500/20' };
  }
};
