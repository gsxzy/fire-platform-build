import { useState, useMemo } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApiResource, type ApiService } from '@/hooks/useApiResource';
import EmptyState from '@/components/EmptyState';
import TableSkeleton from '@/components/TableSkeleton';
import {
  Search, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight,
  X, Save, AlertTriangle, Printer, RefreshCw, FileSpreadsheet,
  CheckSquare, Square, Filter, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

/* ===== Types ===== */
export interface Column {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'date' | 'number' | 'textarea' | 'checkbox' | 'readonly';
  options?: string[] | { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export interface FilterField {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface PageTemplateProps {
  title?: string;
  icon?: React.ElementType;
  showHeader?: boolean;
  badge?: string;
  badgeColor?: string;
  columns: Column[];
  /* 本地模式：直接传入静态数据 */
  initialData?: Record<string, unknown>[];
  /* API 模式：传入 service 对象，自动走 API */
  service?: ApiService;
  fields?: FormField[];
  filterFields?: FilterField[];
  initialFilters?: Record<string, string>;
  actions?: boolean;
  searchable?: boolean;
  addable?: boolean;
  pageSize?: number;
  exportable?: boolean;
  printable?: boolean;
  refreshable?: boolean;
  batchable?: boolean;
  filterable?: boolean;
  /* 自定义新增保存逻辑，返回 true 则关闭弹窗 */
  onCustomAddSave?: (values: Record<string, unknown>) => Promise<boolean>;
  /* 每行额外操作按钮 */
  renderExtraActions?: (row: Record<string, unknown>) => React.ReactNode;
}

/* ===== Delete Confirm Modal ===== */
function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-200 text-center mb-1">确认删除</h3>
        <p className="text-xs text-slate-400 text-center mb-4">
          确定要删除 <span className="text-red-400 font-medium">{name}</span> 吗？删除后不可恢复。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-600 text-slate-300" onClick={onClose}>取消</Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </div>
  );
}

/* ===== View Detail Modal ===== */
function ViewModal({ row, columns, onClose }: { row: Record<string, unknown>; columns: Column[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" />详情</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {columns.map(col => (
            <div key={col.key} className="flex items-start gap-3">
              <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{col.label}</span>
              <span className="text-xs text-slate-200 flex-1">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-600/30 flex justify-end">
          <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}

/* ===== Add/Edit Form Modal ===== */
function FormModal({
  title, fields, initialValues, onSave, onClose,
}: {
  title: string;
  fields: FormField[];
  initialValues: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...initialValues });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (vals: Record<string, unknown>): Record<string, string> => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const val = String(vals[f.key] ?? '').trim();
      if (f.required && !val && f.type !== 'checkbox') {
        errs[f.key] = `${f.label}不能为空`;
      }
      if (val) {
        if (f.key === 'phone' || f.key === 'contactPhone' || f.label?.includes('电话')) {
          if (!/^1[3-9]\d{9}$/.test(val) && !/^(0\d{2,3}-?)?\d{7,8}$/.test(val)) {
            errs[f.key] = '请输入有效的电话号码';
          }
        }
        if (f.key === 'email' || f.label?.includes('邮箱')) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            errs[f.key] = '请输入有效的邮箱地址';
          }
        }
      }
    }
    return errs;
  };

  const handleChange = (key: string, value: unknown) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setTouched(prev => new Set(prev).add(key));
    setErrors(validate(next));
  };

  const handleSubmit = () => {
    const allTouched = new Set(fields.map(f => f.key));
    setTouched(allTouched);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave(values);
  };

  const isValid = Object.keys(validate(values)).length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map(field => {
            const hasErr = touched.has(field.key) && !!errors[field.key];
            return (
            <div key={field.key}>
              <label className="text-[10px] text-slate-400 mb-1 block">
                {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.disabled || field.type === 'readonly' ? (
                <div className="w-full bg-slate-800/40 border border-slate-600/20 rounded-md px-3 py-2 text-xs text-slate-400 select-none">
                  {String(values[field.key] ?? '-')}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!values[field.key]}
                    onChange={e => handleChange(field.key, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/30 text-blue-500 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">{field.placeholder || '是'}</span>
                </label>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={String(values[field.key] ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || `输入${field.label}`}
                  rows={3}
                  className={`w-full bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(values[field.key] ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className={`w-full bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`}
                >
                  <option value="">请选择</option>
                  {field.options?.map(opt => {
                    const isObj = typeof opt === 'object' && opt !== null;
                    const label = isObj ? (opt as { label: string }).label : opt;
                    const value = isObj ? (opt as { value: string }).value : opt;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              ) : field.type === 'date' ? (
                <input type="date" value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} className={`w-full bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`} />
              ) : field.type === 'number' ? (
                <input type="number" value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, Number(e.target.value))} placeholder={field.placeholder || `输入${field.label}`} className={`w-full bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`} />
              ) : (
                <Input value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder || `输入${field.label}`} className={`h-8 text-xs bg-slate-700/30 text-slate-200 transition-colors ${hasErr ? 'border-red-500/50 focus-visible:ring-red-500/30' : 'border-slate-600/30'}`} />
              )}
              {hasErr && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors[field.key]}</p>}
            </div>
          );})}
        </div>
        <div className="p-4 border-t border-slate-600/30 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-slate-600 text-slate-300" onClick={onClose}>取消</Button>
          <Button size="sm" className={`h-8 text-xs flex items-center gap-1.5 ${isValid ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`} onClick={handleSubmit} disabled={!isValid}>
            <Save className="w-3.5 h-3.5" />保存
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   本地数据管理 Hook（兼容原有 initialData 模式）
   ═══════════════════════════════════════════════════════════════════ */
function useLocalData(initialData: Record<string, unknown>[], pageSize: number) {
  const [data, setData] = useState<Record<string, unknown>[]>(initialData);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let result = [...data];
    if (keyword) {
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(keyword.toLowerCase()))
      );
    }
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val) result = result.filter(row => String(row[key]) === val);
    });
    if (sortKey) {
      result.sort((a: any, b: any) => {
        const av = String(a[sortKey] ?? '');
        const bv = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh');
      });
    }
    return result;
  }, [data, keyword, activeFilters, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleAdd = (values: Record<string, unknown>) => {
    setData(prev => [{ ...values, id: Date.now() }, ...prev]);
  };
  const handleEdit = (idx: number, values: Record<string, unknown>) => {
    setData(prev => prev.map((r: any, i: number) => i === idx ? { ...r, ...values } : r));
  };
  const handleDelete = (idx: number) => {
    setData(prev => prev.filter((_, i) => i !== idx));
  };
  const refreshData = () => setData([...initialData]);

  return {
    data, setData, paged, filtered, total: filtered.length, totalPages,
    page, setPage, keyword, setKeyword,
    sortKey, sortDir, toggleSort,
    activeFilters, setActiveFilters,
    handleAdd, handleEdit, handleDelete, refreshData,
    loading: false,
  };
}

/* ===== Main Template ===== */
export default function PageTemplate({
  title, icon: Icon, showHeader = true, badge, badgeColor = 'bg-blue-500/20 text-blue-400',
  columns, initialData = [], service, fields = [], filterFields = [], initialFilters = {}, actions = true, searchable = true, addable = true, pageSize = 10,
  exportable = true, printable = true, refreshable = true, batchable = true, filterable = true,
  onCustomAddSave, renderExtraActions,
}: PageTemplateProps) {
  const useApi = !!service;

  // API 模式
  const apiRes = useApi
    ? useApiResource<Record<string, unknown>>({ service: service as any, defaultPageSize: pageSize, initialFilters })
    : null;

  // 本地模式
  const localRes = !useApi
    ? useLocalData(initialData, pageSize)
    : null;

  // 统一取值（兼容两种模式）
  const data = apiRes?.data ?? localRes?.data ?? [];
  const paged = apiRes?.data ?? localRes?.paged ?? [];
  const total = apiRes?.total ?? localRes?.total ?? 0;
  const totalPages = apiRes ? Math.ceil((apiRes.total || 0) / pageSize) : (localRes?.totalPages ?? 0);
  const page = apiRes?.page ?? localRes?.page ?? 1;
  const setPage = apiRes?.setPage ?? localRes?.setPage ?? (() => {});
  const keyword = apiRes?.keyword ?? localRes?.keyword ?? '';
  const setKeyword = apiRes?.setKeyword ?? localRes?.setKeyword ?? (() => {});
  const sortKey = apiRes?.sortKey ?? localRes?.sortKey ?? null;
  const sortDir = apiRes?.sortDir ?? localRes?.sortDir ?? 'asc';
  const toggleSort = apiRes?.toggleSort ?? localRes?.toggleSort ?? (() => {});
  const loading = apiRes?.loading ?? localRes?.loading ?? false;
  const activeFilters = apiRes ? {} : (localRes?.activeFilters ?? {});
  const setActiveFilters = apiRes?.setActiveFilters ?? localRes?.setActiveFilters ?? (() => {});
  const refreshData = apiRes?.refresh ?? localRes?.refreshData ?? (() => {});

  const [exporting, setExporting] = useState(false);
  const [, setLastRefresh] = useState(new Date());

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchBar, setShowBatchBar] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Filter UI
  const [showFilter, setShowFilter] = useState(false);

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [viewingRow, setViewingRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);

  // Get unique values for filter (本地模式才需要)
  const filterOptions = useMemo(() => {
    if (useApi) return {};
    const opts: Record<string, Set<string>> = {};
    columns.forEach(col => {
      const values = new Set<string>();
      data.forEach(row => {
        const v = String(row[col.key] ?? '');
        if (v) values.add(v);
      });
      if (values.size > 1 && values.size <= 20) {
        opts[col.key] = values;
      }
    });
    return opts;
  }, [columns, data, useApi]);

  const getWidth = (col: Column) => col.width || `${Math.floor(100 / columns.length)}%`;

  const formFields: FormField[] = fields.length > 0 ? fields : columns.map(col => ({
    key: col.key, label: col.label, type: 'text' as const,
  }));

  const getRowName = (row: Record<string, unknown>) =>
    String(row.name ?? row.unitName ?? row.deviceName ?? row.code ?? row.title ?? '该记录');

  // Selection
  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    setShowBatchBar(true);
  };
  const toggleSelectAll = () => {
    const currentIds = paged.map((_: any, i: number) => (page - 1) * pageSize + i);
    const allSelected = currentIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      currentIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
    setShowBatchBar(true);
  };
  const clearSelection = () => { setSelectedIds(new Set()); setShowBatchBar(false); };
  const batchDelete = async () => {
    setShowBatchConfirm(true);
  };
  const confirmBatchDelete = async () => {
    setShowBatchConfirm(false);
    if (useApi && apiRes) {
      const idsToDelete = Array.from(selectedIds);
      for (const idx of idsToDelete) {
        const row = data[idx];
        if (row?.id) await apiRes.delete(String(row.id));
      }
    } else if (localRes) {
      localRes.setData(prev => prev.filter((_, i) => !selectedIds.has(i)));
    }
    clearSelection();
  };

  const handleAddSave = async (values: Record<string, unknown>) => {
    if (onCustomAddSave) {
      const ok = await onCustomAddSave(values);
      if (ok) setShowAdd(false);
    } else if (useApi && apiRes) {
      const ok = await apiRes.create(values);
      if (ok) setShowAdd(false);
    } else if (localRes) {
      localRes.handleAdd(values);
      setShowAdd(false);
    }
  };

  const handleEditSave = async (values: Record<string, unknown>) => {
    if (!editingRow) return;
    if (useApi && apiRes) {
      const id = String(editingRow.id ?? '');
      if (id) {
        const ok = await apiRes.update(id, values);
        if (ok) setEditingRow(null);
      }
    } else if (localRes) {
      const idx = data.findIndex((r, i) => (r.id ?? i) === (editingRow.id ?? data.indexOf(editingRow)));
      if (idx >= 0) localRes.handleEdit(idx, values);
      setEditingRow(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRow) return;
    if (useApi && apiRes) {
      const id = String(deletingRow.id ?? '');
      if (id) {
        const ok = await apiRes.delete(id);
        if (ok) setDeletingRow(null);
      }
    } else if (localRes) {
      const idx = data.findIndex((r, i) => (r.id ?? i) === (deletingRow.id ?? data.indexOf(deletingRow)));
      if (idx >= 0) localRes.handleDelete(idx);
      setDeletingRow(null);
    }
  };

  // Export / Print / Refresh
  const exportCSV = () => {
    const exportData = useApi ? data : (localRes?.filtered ?? data);
    setExporting(true);
    setTimeout(() => {
      const headers = columns.map(c => c.label).join(',');
      const rows = exportData.map(row => columns.map(col => {
        const str = String(row[col.key] ?? '');
        return '"' + str.replace(/"/g, '""') + '"';
      }).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 300);
  };
  const printTable = () => {
    const printData = useApi ? data : (localRes?.filtered ?? data);
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px}h2{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f0f0f0}</style></head><body><h2>${title}</h2><p style="color:#666;font-size:11px">打印时间:${new Date().toLocaleString('zh-CN')}|共${printData.length}条</p><table><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${printData.map(r=>`<tr>${columns.map(c=>`<td>${String(r[c.key]??'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    pw.document.close();
    pw.print();
  };
  const doRefresh = () => { refreshData(); setLastRefresh(new Date()); setSelectedIds(new Set()); };

  const buildInitialValues = (row?: Record<string, unknown>) => {
    const vals: Record<string, unknown> = {};
    formFields.forEach(f => { vals[f.key] = row?.[f.key] ?? ''; });
    if (row?.id) vals.id = row.id;
    return vals;
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header */}
      {showHeader && (
      <div className="flex items-center justify-between flex-shrink-0 glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          {Icon && <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
            <Icon className="w-4 h-4 text-blue-400" />
          </div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {title && <h2 className="text-subhead font-bold text-slate-100">{title}</h2>}
              {badge && <Badge variant="outline" className={`text-caption ${badgeColor}`}>{badge}</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-caption text-slate-500">共 <span className="text-slate-300 font-medium">{total}</span> 条记录</span>
              {selectedCount > 0 && <span className="text-caption text-blue-400">· 已选 <span className="font-medium">{selectedCount}</span> 条</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索关键词..." className="pl-8 h-8 w-52 text-body-sm bg-slate-700/50 border-slate-600/40 text-slate-200 rounded-lg focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20" />
            </div>
          )}
          {refreshable && (
            <button onClick={doRefresh} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-600/30" title="刷新" aria-label="刷新">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {filterable && ((!useApi && Object.keys(filterOptions).length > 0) || (useApi && filterFields.length > 0)) && (
            <button onClick={() => setShowFilter(!showFilter)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all border border-slate-600/30 ${showFilter ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`} title="高级筛选" aria-label="筛选">
              <Filter className="w-3.5 h-3.5" />
            </button>
          )}
          {exportable && (
            <button onClick={exportCSV} disabled={exporting} className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-body-sm text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 transition-all border border-slate-600/30 disabled:opacity-50" title="导出CSV">
              <FileSpreadsheet className="w-3.5 h-3.5" /><span className="hidden sm:inline">导出</span>
            </button>
          )}
          {printable && (
            <button onClick={printTable} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-600/30" title="打印">
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
          {addable && (
            <Button size="sm" className="h-8 text-body-sm bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-900/20" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />新增
            </Button>
          )}
        </div>
      </div>
      )}

      {/* Advanced Filter Bar */}
      {filterable && showFilter && (
        <div className="glass rounded-xl p-3 flex items-center gap-3 flex-wrap animate-fade-in-up">
          <span className="text-[10px] text-slate-400">筛选条件：</span>
          {filterFields.map(field => (
            <select
              key={field.key}
              value={String(activeFilters[field.key] || '')}
              onChange={e => (setActiveFilters as any)((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
              className="bg-slate-700 border border-slate-600/50 rounded-md px-2 py-1 text-[10px] text-slate-100 outline-none"
            >
              <option value="">{field.label} - 全部</option>
              {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ))}
          {!useApi && Object.entries(filterOptions).map(([key, values]) => (
            <select
              key={key}
              value={activeFilters[key] || ''}
              onChange={e => (setActiveFilters as any)((prev: any) => ({ ...prev, [key]: e.target.value }))}
              className="bg-slate-700 border border-slate-600/50 rounded-md px-2 py-1 text-[10px] text-slate-100 outline-none"
            >
              <option value="">{columns.find(c => c.key === key)?.label} - 全部</option>
              {Array.from(values).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
          {Object.values(activeFilters).some(v => v) && (
            <button onClick={() => setActiveFilters({})} className="text-[10px] text-red-400 hover:text-red-300">清除筛选</button>
          )}
        </div>
      )}

      {/* Batch Action Bar */}
      {showBatchBar && selectedCount > 0 && (
        <div className="glass rounded-xl px-3 py-2 flex items-center justify-between border-blue-500/20 shadow-sm shadow-blue-500/5 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] text-blue-400">已选择 <span className="font-bold">{selectedCount}</span> 条记录</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={batchDelete}>
              <Trash2 className="w-3 h-3 mr-1" />批量删除
            </Button>
            <button onClick={clearSelection} className="text-[10px] text-slate-500 hover:text-slate-300 px-2">取消</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 fire-card min-h-0 flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Table Header */}
          <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex gap-1 text-[9px] text-slate-500 px-2 items-center">
              {batchable && (
                <span style={{ width: '28px' }} className="flex-shrink-0">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-blue-400 transition-colors">
                    {paged.length > 0 && paged.every((_, i) => selectedIds.has((page - 1) * pageSize + i)) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </span>
              )}
              {columns.map(col => (
                <span key={col.key} style={{ width: getWidth(col) }} className={`truncate flex items-center gap-1 ${col.sortable !== false ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`} onClick={() => col.sortable !== false && toggleSort(col.key)}>
                  {col.label}
                  {col.sortable !== false && sortKey === col.key && (
                    sortDir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-blue-400" /> : <ArrowDown className="w-2.5 h-2.5 text-blue-400" />
                  )}
                  {col.sortable !== false && sortKey !== col.key && <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                </span>
              ))}
              {actions && <span style={{ width: '80px' }} className="text-right">操作</span>}
            </div>
          </div>
          {/* Table Body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1 relative">
            {loading && (
              <TableSkeleton
                rows={Math.min(pageSize, 6)}
                columns={columns.length}
                hasActions={actions}
                hasCheckbox={batchable}
              />
            )}
            {!loading && paged.map((row: any, i: number) => {
              const globalIdx = (page - 1) * pageSize + i;
              const isSelected = selectedIds.has(globalIdx);
              return (
                <div key={i} className={`flex gap-1 p-2.5 rounded-lg border transition-all items-center animate-fade-in-up row-indicator active-press ${isSelected ? 'border-blue-500/30 bg-blue-500/8 ring-1 ring-blue-500/10' : 'border-slate-600/20 bg-slate-700/20 hover:border-slate-500/30 hover:bg-slate-600/15'}`} style={{ animationDelay: `${i * 0.02}s` }}>
                  {batchable && (
                    <span style={{ width: '28px' }} className="flex-shrink-0">
                      <button onClick={() => toggleSelect(globalIdx)} className="text-slate-500 hover:text-blue-400 transition-colors">
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </span>
                  )}
                  {columns.map(col => (
                    <span key={col.key} style={{ width: getWidth(col) }} className="text-caption text-slate-300 truncate">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                    </span>
                  ))}
                  {actions && (
                    <div style={{ width: renderExtraActions ? '120px' : '80px' }} className="flex items-center justify-end gap-0.5">
                      {renderExtraActions?.(row)}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all" aria-label="查看" onClick={() => setViewingRow(row)}><Eye className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all" aria-label="编辑" onClick={() => setEditingRow(row)}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all" aria-label="删除" onClick={() => setDeletingRow(row)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && paged.length === 0 && (
              <EmptyState
                type={keyword || Object.values(activeFilters).some(v => v) ? 'search' : 'data'}
                action={addable ? (
                  <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />新增
                  </Button>
                ) : undefined}
              />
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-2.5 border-t border-slate-700/40 flex items-center justify-between flex-shrink-0">
              <span className="text-caption text-slate-500">共 <span className="text-slate-300 font-medium">{total}</span> 条记录</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-caption text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-md" aria-label="上一页" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pg: number;
                  if (totalPages <= 5) pg = i + 1;
                  else if (page <= 3) pg = i + 1;
                  else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                  else pg = page - 2 + i;
                  return (
                    <Button key={pg} size="sm" variant="ghost" className={`h-7 w-7 text-caption rounded-md transition-all ${page === pg ? 'text-blue-400 bg-blue-500/10 font-medium ring-1 ring-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`} onClick={() => setPage(pg)}>{pg}</Button>
                  );
                })}
                <Button size="sm" variant="ghost" className="h-7 px-2 text-caption text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-md" aria-label="下一页" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}><ChevronRight className="w-3.5 h-3.5" /></Button>
              </div>
              <span className="text-caption text-slate-500">第 <span className="text-slate-300 font-medium">{page}</span> / {totalPages} 页</span>
            </div>
          )}
        </CardContent>
      </div>

      {/* Modals */}
      {showAdd && <FormModal title={`新增${title}`} fields={formFields} initialValues={buildInitialValues()} onSave={handleAddSave} onClose={() => setShowAdd(false)} />}
      {editingRow && <FormModal title={`编辑${title}`} fields={formFields} initialValues={buildInitialValues(editingRow)} onSave={handleEditSave} onClose={() => setEditingRow(null)} />}
      {viewingRow && <ViewModal row={viewingRow} columns={columns} onClose={() => setViewingRow(null)} />}
      {deletingRow && <DeleteModal name={getRowName(deletingRow)} onConfirm={handleDeleteConfirm} onClose={() => setDeletingRow(null)} />}

      {/* Batch Delete Confirm Dialog */}
      <Dialog open={showBatchConfirm} onOpenChange={setShowBatchConfirm}>
        <DialogContent className="bg-slate-800/95 backdrop-blur-md border-slate-700/50 text-slate-100 max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              确认批量删除
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              即将删除 <span className="text-red-400 font-bold">{selectedCount}</span> 条记录，此操作不可恢复，是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBatchConfirm(false)} className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700/40 rounded-lg">
              取消
            </Button>
            <Button onClick={confirmBatchDelete} className="h-8 text-xs bg-red-600 hover:bg-red-700 rounded-lg">
              <Trash2 className="w-3 h-3 mr-1" />确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
