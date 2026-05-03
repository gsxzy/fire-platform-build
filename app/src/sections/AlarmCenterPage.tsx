import { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/core/ToastContext';
import { alarmService } from '@/api/services';
import type { Alarm } from '@/types/db';
import {
  Flame, AlertTriangle, Bell, Shield, CheckCircle, XCircle,
  Search, Eye, Check, ChevronLeft, ChevronRight, Loader2,
  Clock, MapPin, RotateCw
} from 'lucide-react';
import AlarmDetailModal from './AlarmDetailModal';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

const typeTabs = [
  { key: 'all', label: '全部', icon: Bell, activeClass: 'bg-blue-500 text-white shadow-sm shadow-blue-500/20' },
  { key: 'fire', label: '火警', icon: Flame, activeClass: 'bg-red-500 text-white shadow-sm shadow-red-500/20' },
  { key: 'fault', label: '故障', icon: AlertTriangle, activeClass: 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/20' },
  { key: 'warning', label: '预警', icon: Shield, activeClass: 'bg-purple-500 text-white shadow-sm shadow-purple-500/20' },
  { key: 'supervisory', label: '监管', icon: CheckCircle, activeClass: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' },
];

const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new: { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  confirmed: { label: '已确认', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  handled: { label: '已处理', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ignored: { label: '已忽略', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

const typeBadgeMap: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  fire: { label: '火警', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Flame },
  fault: { label: '故障', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle },
  warning: { label: '预警', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Shield },
  supervisory: { label: '监管', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
};

const severityMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: '紧急', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  high: { label: '高', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  normal: { label: '一般', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  low: { label: '低', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

export default function AlarmCenterPage() {
  const { success, error: showError } = useToast();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<'true' | 'false'>('true');
  const [remark, setRemark] = useState('');

  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchAlarms = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: any = { page, pageSize };
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (activeTab !== 'all') params.type = activeTab;
      const res = await alarmService.list(params);
      if (res.code === 200) {
        setAlarms(res.data?.list || []);
        setTotal(res.data?.total || 0);
      }
    } catch (e: any) {
      console.error('加载告警失败', e);
      setLoadError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
  }, [page, activeTab, debouncedKeyword]);

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = alarms.filter(a => a.status === 'new').length;
  const fireCount = alarms.filter(a => a.type === 'fire').length;
  const faultCount = alarms.filter(a => a.type === 'fault').length;

  const openDetail = (alarm: Alarm) => { setSelectedAlarm(alarm); setDetailOpen(true); };
  const openConfirm = (alarm: Alarm) => { setSelectedAlarm(alarm); setConfirmOpen(true); setRemark(''); };

  const handleConfirm = async () => {
    if (!selectedAlarm) return;
    try {
      await alarmService.confirm(selectedAlarm.id, '当前用户', remark);
      success('告警确认成功');
      setConfirmOpen(false);
      fetchAlarms();
    } catch (e: any) {
      console.error('确认失败', e);
      showError('告警确认失败', e.message || '请检查网络或稍后重试');
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20">
            <Bell className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">告警中心</h2>
            <p className="text-[10px] text-slate-500">实时告警监控与处置</p>
          </div>
          {pendingCount > 0 && (
            <div className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[10px] text-red-400 font-medium">{pendingCount} 条待处理</span>
            </div>
          )}
          {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索设备/单位/编号"
            className="pl-8 h-8 w-52 text-xs bg-slate-800/60 border-slate-700/40 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all rounded-lg"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        <StatCard label="告警总数" value={total} icon={<Bell className="w-3.5 h-3.5" />} color="blue" unit="条" />
        <StatCard label="待处理" value={pendingCount} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="red" unit="条" />
        <StatCard label="火警" value={fireCount} icon={<Flame className="w-3.5 h-3.5" />} color="yellow" unit="条" />
        <StatCard label="故障" value={faultCount} icon={<XCircle className="w-3.5 h-3.5" />} color="emerald" unit="条" />
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5 flex-shrink-0 w-fit">
        {typeTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 text-[10px] font-medium ${
                active ? tab.activeClass : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alarm Table */}
      <Card className="flex-1 border border-slate-700/30 bg-slate-800/40 backdrop-blur-sm rounded-xl min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Table Header */}
          <div className="px-3 py-2.5 border-b border-slate-700/30 flex-shrink-0 bg-slate-800/60">
            <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 font-medium">
              <span className="col-span-2">告警编号/设备</span>
              <span className="col-span-1">类型</span>
              <span className="col-span-1">等级</span>
              <span className="col-span-1">回路</span>
              <span className="col-span-1">点位</span>
              <span className="col-span-1">单位/位置</span>
              <span className="col-span-1">告警时间</span>
              <span className="col-span-1">状态</span>
              <span className="col-span-1">处理人</span>
              <span className="col-span-2">操作</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5 relative">
            {/* Skeleton Loading */}
            {loading && alarms.length === 0 && (
              <div className="space-y-1.5 p-2">
                {Array.from({ length: pageSize }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-xl border border-slate-700/20 bg-slate-800/20 items-center">
                    <div className="col-span-2 space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-24" /></div>
                    <div className="col-span-1"><Skeleton className="h-5 w-12 rounded-md" /></div>
                    <div className="col-span-1"><Skeleton className="h-5 w-10 rounded-md" /></div>
                    <div className="col-span-1"><Skeleton className="h-3 w-8" /></div>
                    <div className="col-span-1"><Skeleton className="h-3 w-8" /></div>
                    <div className="col-span-1 space-y-1"><Skeleton className="h-3 w-14" /><Skeleton className="h-3 w-10" /></div>
                    <div className="col-span-1"><Skeleton className="h-3 w-16" /></div>
                    <div className="col-span-1"><Skeleton className="h-5 w-12 rounded-md" /></div>
                    <div className="col-span-1"><Skeleton className="h-3 w-10" /></div>
                    <div className="col-span-2 flex gap-1"><Skeleton className="h-6 w-14 rounded-lg" /><Skeleton className="h-6 w-14 rounded-lg" /></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {loadError && !loading && alarms.length === 0 && (
              <EmptyState
                type="error"
                title="数据加载失败"
                description={loadError.message || '请检查网络连接或稍后重试'}
                action={<button onClick={fetchAlarms} className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">重新加载</button>}
              />
            )}
            {alarms.map(a => {
              const isUrgent = a.status === 'new' || a.level === 'urgent';
              const tc = typeBadgeMap[a.type] || typeBadgeMap.warning;
              const sc = statusMap[a.status] || statusMap.new;
              const lc = severityMap[a.level] || severityMap.normal;
              const TypeIcon = tc.icon;

              return (
                <div
                  key={a.id}
                  className={`grid grid-cols-12 gap-2 p-3 rounded-xl border transition-all duration-300 items-center ${
                    isUrgent
                      ? 'bg-red-500/5 border-red-500/20 shadow-sm shadow-red-500/5 hover:bg-red-500/10 hover:scale-[1.01]'
                      : 'bg-slate-800/30 border-slate-700/20 hover:bg-slate-700/20 hover:scale-[1.01]'
                  }`}
                >
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isUrgent && (
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                        </span>
                      )}
                      <span className="text-[9px] text-slate-500 font-mono truncate">{a.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-200 truncate block font-medium mt-0.5">{a.deviceName}</span>
                  </div>

                  <span className="col-span-1">
                    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${tc.bg} ${tc.color} ${tc.border}`}>
                      <TypeIcon className="w-3 h-3" />
                      {tc.label}
                    </span>
                  </span>

                  <span className="col-span-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${lc.bg} ${lc.color} ${lc.border}`}>
                      {lc.label}
                    </span>
                  </span>

                  <span className="col-span-1 text-[9px] text-slate-300 font-mono text-center">
                    {a.loopNo !== undefined && a.loopNo !== null ? a.loopNo : '-'}
                  </span>

                  <span className="col-span-1 text-[9px] text-slate-300 font-mono text-center">
                    {a.pointNo !== undefined && a.pointNo !== null ? a.pointNo : '-'}
                  </span>

                  <div className="col-span-1 min-w-0">
                    <span className="text-[10px] text-slate-300 truncate block">{a.unitName}</span>
                    <span className="text-[8px] text-slate-500 truncate block flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      {a.location}
                    </span>
                  </div>

                  <span className="col-span-1 text-[9px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                    {a.createdAt}
                  </span>

                  <span className="col-span-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${sc.bg} ${sc.color} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </span>

                  <span className="col-span-1 text-[9px] text-slate-400 truncate">{a.handler || '-'}</span>

                  <span className="col-span-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDetail(a)}
                      className="h-6 px-2 text-[9px] text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all rounded-lg"
                    >
                      <Eye className="w-3 h-3 mr-0.5" />
                      查看
                    </Button>
                    {a.status === 'new' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openConfirm(a)}
                        className="h-6 px-2 text-[9px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"
                      >
                        <Check className="w-3 h-3 mr-0.5" />
                        确认
                      </Button>
                    )}
                  </span>
                </div>
              );
            })}
            {alarms.length === 0 && !loading && !loadError && (
              <EmptyState
                type="data"
                title="暂无告警数据"
                description="当前条件下没有匹配的告警记录"
                action={<button onClick={fetchAlarms} className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600/30 hover:bg-slate-700/60 transition-colors flex items-center gap-1"><RotateCw className="w-3 h-3" />刷新</button>}
              />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-2 border-t border-slate-700/30 flex items-center justify-end gap-1 flex-shrink-0 bg-slate-800/40">
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all rounded-lg" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label="上一页">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[10px] text-slate-500 px-2">{page} / {totalPages}</span>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all rounded-lg" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="下一页">
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {detailOpen && selectedAlarm && (
        <AlarmDetailModal alarm={selectedAlarm as any} onClose={() => setDetailOpen(false)} />
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-800/95 backdrop-blur-md border-slate-700/50 text-slate-100 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="w-5 h-5 text-red-400" />
              告警确认
            </DialogTitle>
          </DialogHeader>
          {selectedAlarm && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                设备：<span className="text-slate-200">{selectedAlarm.deviceName}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmResult('true')}
                  className={`flex-1 p-2.5 rounded-xl border text-center text-xs transition-all ${
                    confirmResult === 'true'
                      ? 'border-red-500/60 bg-red-500/10 text-red-300 shadow-sm shadow-red-500/10'
                      : 'border-slate-600 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  <Flame className="w-4 h-4 mx-auto mb-1" />
                  真警
                </button>
                <button
                  onClick={() => setConfirmResult('false')}
                  className={`flex-1 p-2.5 rounded-xl border text-center text-xs transition-all ${
                    confirmResult === 'false'
                      ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300 shadow-sm shadow-yellow-500/10'
                      : 'border-slate-600 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  <XCircle className="w-4 h-4 mx-auto mb-1" />
                  误报
                </button>
              </div>
              <div>
                <Label className="text-slate-300 text-xs">备注</Label>
                <Textarea
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  placeholder="请输入确认备注"
                  className="bg-slate-700/60 border-slate-600/60 text-slate-200 mt-1 text-xs min-h-[60px] rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700/40 rounded-lg">
              取消
            </Button>
            <Button onClick={handleConfirm} className="h-8 text-xs bg-red-600 hover:bg-red-700 rounded-lg">
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


