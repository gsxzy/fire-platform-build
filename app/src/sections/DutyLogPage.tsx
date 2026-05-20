import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/core/ToastContext';

import { dutyService } from '@/api/services';
import { getErrorMessage } from '@/types/api';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  FileText, Plus, Download, Printer, Calendar,
  AlertCircle, CheckCircle, PenTool, Paperclip
} from 'lucide-react';
import { exportToCsv } from '@/utils/export';

interface DutyLogItem {
  id: string;
  logNo: string;
  scheduleId?: string;
  userId: string;
  userName: string;
  eventType: number;
  eventSource: string;
  content: string;
  attachments?: string;
  createdAt: string;
  onDutyTime?: string;
  offDutyTime?: string;
}

const EVENT_SOURCE_LABEL: Record<string, string> = {
  alarm: '告警联动',
  disposal: '接警处置',
  patrol: '巡检记录',
  manual: '手动记录',
  system: '系统自动',
};

const EVENT_SOURCE_COLOR: Record<string, string> = {
  alarm: 'bg-red-500/20 text-red-400 border-red-500/30',
  disposal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  patrol: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  manual: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  system: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function formatDate(d: string): string {
  if (!d) return '-';
  return d.replace('T', ' ').slice(0, 19);
}

export default function DutyLogPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<DutyLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    eventType: '',
    eventSource: '',
    startTime: '',
    endTime: '',
    keyword: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ content: '', eventSource: 'manual', attachments: '' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<DutyLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize };
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.eventSource) params.eventSource = filters.eventSource;
      if (filters.startTime) params.startTime = filters.startTime;
      if (filters.endTime) params.endTime = filters.endTime;
      if (filters.keyword) params.keyword = filters.keyword;
      const res = await dutyService.logList(params);
      if (res.code === 200) {
        setLogs((res.data?.list || []).map((l: any) => ({
          id: String(l.id),
          logNo: l.log_no || '-',
          scheduleId: l.schedule_id,
          userId: String(l.user_id),
          userName: l.user_name || '-',
          eventType: l.event_type || 1,
          eventSource: l.event_source || 'system',
          content: l.content || l.handover_content || l.incidents || '-',
          attachments: l.attachments,
          createdAt: l.created_at,
          onDutyTime: l.on_duty_time,
          offDutyTime: l.off_duty_time,
        })));
        setTotal(res.data?.total || 0);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = useCallback(() => {
    const rows = logs.map(l => ({
      日志编号: l.logNo,
      记录时间: formatDate(l.createdAt),
      值班人: l.userName,
      事件类型: l.eventType === 1 ? '系统自动' : '手动记录',
      事件来源: EVENT_SOURCE_LABEL[l.eventSource] || l.eventSource,
      内容: l.content,
    }));
    exportToCsv(rows, `值班日志_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('导出成功');
  }, [logs, toast]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html><head><title>值班日志打印</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}
      th{background:#f5f5f5}</style></head><body>
      <h2>值班日志报表</h2>
      <table><tr><th>日志编号</th><th>记录时间</th><th>值班人</th><th>事件类型</th><th>事件来源</th><th>内容</th></tr>
      ${logs.map(l => `<tr><td>${l.logNo}</td><td>${formatDate(l.createdAt)}</td><td>${l.userName}</td><td>${l.eventType === 1 ? '系统自动' : '手动记录'}</td><td>${EVENT_SOURCE_LABEL[l.eventSource] || l.eventSource}</td><td>${l.content}</td></tr>`).join('')}
      </table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }, [logs]);

  const handleAddLog = async () => {
    if (!form.content.trim()) {
      toast.error('请填写事件内容');
      return;
    }
    try {
      await dutyService.addLog({
        content: form.content,
        eventSource: form.eventSource,
        attachments: form.attachments || undefined,
      });
      toast.success('记录成功');
      setModalOpen(false);
      setForm({ content: '', eventSource: 'manual', attachments: '' });
      fetchLogs();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const columns = useMemo(() => [
    { key: 'logNo', title: '日志编号', width: 140 },
    {
      key: 'eventType',
      title: '事件类型',
      width: 100,
      render: (r: DutyLogItem) => (
        <Badge variant="outline" className={r.eventType === 1
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }>
          {r.eventType === 1 ? '系统自动' : '手动记录'}
        </Badge>
      ),
    },
    {
      key: 'eventSource',
      title: '事件来源',
      width: 100,
      render: (r: DutyLogItem) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${EVENT_SOURCE_COLOR[r.eventSource] || EVENT_SOURCE_COLOR.system}`}>
          {EVENT_SOURCE_LABEL[r.eventSource] || r.eventSource}
        </span>
      ),
    },
    { key: 'createdAt', title: '记录时间', width: 160, render: (r: DutyLogItem) => formatDate(r.createdAt) },
    { key: 'userName', title: '值班人', width: 100 },
    {
      key: 'content',
      title: '事件内容',
      render: (r: DutyLogItem) => (
        <div className="max-w-md truncate" title={r.content}>{r.content}</div>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (r: DutyLogItem) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setDetail(r); setDetailOpen(true); }}>
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-400" />
        <h1 className="text-lg font-bold text-slate-100">值班日志</h1>
      </div>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              className="bg-transparent text-sm text-slate-200 outline-none w-32"
              value={filters.startTime}
              onChange={e => setFilters(f => ({ ...f, startTime: e.target.value }))}
            />
            <span className="text-slate-500">~</span>
            <input
              type="date"
              className="bg-transparent text-sm text-slate-200 outline-none w-32"
              value={filters.endTime}
              onChange={e => setFilters(f => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <Select value={filters.eventSource} onValueChange={v => setFilters(f => ({ ...f, eventSource: v }))}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue placeholder="事件来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value="alarm">告警联动</SelectItem>
              <SelectItem value="disposal">接警处置</SelectItem>
              <SelectItem value="patrol">巡检记录</SelectItem>
              <SelectItem value="manual">手动记录</SelectItem>
              <SelectItem value="system">系统自动</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索内容/值班人"
            className="w-48 bg-slate-800/50 border-slate-700 text-slate-200"
            value={filters.keyword}
            onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> 导出
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> 打印
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> 手动记录
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '今日记录', value: logs.filter(l => l.createdAt?.startsWith(new Date().toISOString().slice(0, 10))).length, icon: FileText, color: 'text-blue-400' },
          { label: '手动记录', value: logs.filter(l => l.eventType === 2).length, icon: PenTool, color: 'text-emerald-400' },
          { label: '告警联动', value: logs.filter(l => l.eventSource === 'alarm').length, icon: AlertCircle, color: 'text-red-400' },
          { label: '系统记录', value: logs.filter(l => l.eventType === 1).length, icon: CheckCircle, color: 'text-slate-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-800/40 border-slate-700/50">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <div className="text-lg font-bold text-slate-100">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 表格 */}
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/70 text-slate-300">
            <tr>
              {columns.map(c => (
                <th key={c.key} className="px-3 py-2.5 text-left font-medium whitespace-nowrap" style={{ width: c.width }}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">加载中...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">暂无记录</td></tr>
            ) : logs.map(row => (
              <tr key={row.id} className="border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors">
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-slate-400">共 {total} 条</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <span className="px-3 text-sm text-slate-300">{page}</span>
            <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* 新增记录弹窗 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-400" /> 手动记录值班事件
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-300">事件来源</Label>
              <Select value={form.eventSource} onValueChange={v => setForm(f => ({ ...f, eventSource: v }))}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手动记录</SelectItem>
                  <SelectItem value="patrol">巡检记录</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">事件内容</Label>
              <Textarea
                className="mt-1 bg-slate-800 border-slate-700 text-slate-200 min-h-[100px]"
                placeholder="请详细描述值守期间发生的情况..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-slate-300">附件</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  placeholder="附件URL（多个用逗号分隔）"
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  value={form.attachments}
                  onChange={e => setForm(f => ({ ...f, attachments: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleAddLog}>
              <CheckCircle className="w-4 h-4 mr-1" /> 保存记录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> 日志详情
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">日志编号</div>
                  <div className="text-slate-200 font-mono">{detail.logNo}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">记录时间</div>
                  <div className="text-slate-200">{formatDate(detail.createdAt)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">值班人</div>
                  <div className="text-slate-200">{detail.userName}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">事件来源</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${EVENT_SOURCE_COLOR[detail.eventSource]}`}>
                    {EVENT_SOURCE_LABEL[detail.eventSource] || detail.eventSource}
                  </span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">事件内容</div>
                <div className="text-slate-200 whitespace-pre-wrap">{detail.content}</div>
              </div>
              {detail.attachments && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">附件</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.attachments.split(',').map((url, i) => (
                      <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs underline">
                        <Paperclip className="w-3 h-3 inline mr-1" />附件{i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
