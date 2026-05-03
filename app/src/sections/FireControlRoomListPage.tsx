import { useState, useLayoutEffect, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/core/ToastContext';
import { ControlRoomDAO } from '@/db/Database';
import { api as httpApi } from '@/api/client';
import { generateRoomData, crHostsCache } from '@/api/mock';
import {
  Search, ChevronLeft, ChevronRight,
  Monitor, CheckSquare, Square, Edit3, Trash2, X, Save,
  AlertTriangle, Cpu, FileText, Server, Plus, Loader2,
  CircuitBoard, Grid3X3, Zap, Activity
} from 'lucide-react';

/* ===== Types ===== */
interface ControlRoom {
  id: string;
  unitName: string;
  projectName?: string;
  controllerModel: string;
  hostNo: string;
  busDevices: number;
  busPoints: number;
  multilineDevices: number;
  multilinePoints: number;
  serviceStart: string;
  serviceEnd: string;
  online: boolean;
}

/* ===== Room Form Modal (Add / Edit) ===== */
function RoomFormModal({
  room,
  mode,
  onSave,
  onClose,
}: {
  room: ControlRoom | null;
  mode: 'add' | 'edit';
  onSave: (room: ControlRoom) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ControlRoom>({
    id: '',
    unitName: '',
    controllerModel: '',
    hostNo: '',
    busDevices: 0,
    busPoints: 0,
    multilineDevices: 0,
    multilinePoints: 0,
    serviceStart: '',
    serviceEnd: '',
    online: true,
  });

  useLayoutEffect(() => {
    if (room) setForm({ ...room });
    else setForm({
      id: 'CR' + Date.now(),
      unitName: '',
      controllerModel: '',
      hostNo: '主机1',
      busDevices: 0,
      busPoints: 0,
      multilineDevices: 0,
      multilinePoints: 0,
      serviceStart: '',
      serviceEnd: '',
      online: true,
    });
  }, [room]);

  const isAdd = mode === 'add';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            {isAdd ? <Plus className="w-4 h-4 text-blue-400" /> : <Edit3 className="w-4 h-4 text-blue-400" />}
            {isAdd ? '新增消控室' : '编辑消控室'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">单位名称 <span className="text-red-400">*</span></label>
            <Input value={form.unitName} onChange={e => setForm({ ...form, unitName: e.target.value })} placeholder="输入单位名称" className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">控制器型号 <span className="text-red-400">*</span></label>
            <Input value={form.controllerModel} onChange={e => setForm({ ...form, controllerModel: e.target.value })} placeholder="输入控制器型号" className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">主机编号</label>
            <Input value={form.hostNo} onChange={e => setForm({ ...form, hostNo: e.target.value })} placeholder="如：主机1" className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">总线设备</label>
              <Input type="number" value={form.busDevices} onChange={e => setForm({ ...form, busDevices: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备点位</label>
              <Input type="number" value={form.busPoints} onChange={e => setForm({ ...form, busPoints: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">多线设备</label>
              <Input type="number" value={form.multilineDevices} onChange={e => setForm({ ...form, multilineDevices: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">多线点位</label>
              <Input type="number" value={form.multilinePoints} onChange={e => setForm({ ...form, multilinePoints: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">服务开始</label>
              <Input type="date" value={form.serviceStart} onChange={e => setForm({ ...form, serviceStart: e.target.value })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">服务结束</label>
              <Input type="date" value={form.serviceEnd} onChange={e => setForm({ ...form, serviceEnd: e.target.value })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800/60 rounded-lg">取消</Button>
          <Button size="sm" onClick={() => {
            if (!form.unitName?.trim()) {
              alert('单位名称不能为空');
              return;
            }
            onSave(form);
          }} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg">
            <Save className="w-3.5 h-3.5" />保存
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ===== Delete Confirm Modal ===== */
function DeleteConfirmModal({
  room,
  onConfirm,
  onClose,
}: {
  room: ControlRoom | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!room) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-200 mb-1">确认删除</h3>
          <p className="text-xs text-slate-400">
            确定要删除 <span className="text-red-400 font-medium">{room.unitName}</span> 的消控室卡片吗？
          </p>
          <p className="text-[10px] text-slate-400 mt-1">删除后不可恢复，请谨慎操作。</p>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800/60 rounded-lg" onClick={onClose}>取消</Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg" onClick={onConfirm}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ===== Control Room Card ===== */
function ControlRoomCard({
  room,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  room: ControlRoom;
  selected: boolean;
  onSelect: () => void;
  onEdit: (room: ControlRoom) => void;
  onDelete: (room: ControlRoom) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/monitor/control/room/${room.id}`)}
      className={`border cursor-pointer group relative overflow-hidden backdrop-blur-sm transition-all hover:scale-[1.01] ${
        selected
          ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-xl'
          : 'border-slate-700/30 bg-slate-800/40 hover:bg-slate-700/40 rounded-xl'
      }`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${room.online ? 'bg-emerald-500/60' : 'bg-slate-600/40'}`} />

      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30">
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button onClick={onSelect} className="text-slate-500 hover:text-blue-400 transition-colors">
              {selected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
            </button>
            {room.online ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] text-emerald-400 font-medium">在线</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-[10px] text-slate-500 font-medium">离线</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(room)} className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-all" title="编辑">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(room)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all" title="删除" aria-label="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Project Name & Unit */}
        <div className="px-3 py-2">
          <div className="flex items-start gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${room.online ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-slate-700/20 ring-1 ring-slate-700/40'}`}>
              <Server className={`w-5 h-5 ${room.online ? 'text-emerald-400' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-100 truncate">{room.projectName || room.unitName}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{room.unitName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] bg-blue-500/8 text-blue-400 border-blue-500/20 font-medium">
                  <Cpu className="w-2.5 h-2.5 mr-1" />{room.controllerModel || 'JB-3208G'}
                </Badge>
                <span className="text-[10px] text-slate-500 font-mono">{room.hostNo}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-blue-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-blue-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-blue-500/15">
                <CircuitBoard className="w-2.5 h-2.5 text-blue-400" />
              </div>
              <div className="text-xs font-bold text-blue-400">{room.busDevices}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">总线设备</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-emerald-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-emerald-500/15">
                <Grid3X3 className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-emerald-400">{room.busPoints}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">设备点位</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-amber-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-amber-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-amber-500/15">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <div className="text-xs font-bold text-amber-400">{room.multilineDevices}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">多线设备</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-cyan-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-cyan-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-cyan-500/15">
                <Activity className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-cyan-400">{room.multilinePoints}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">多线点位</div>
            </div>
          </div>

          {/* Service Period */}
          {room.serviceStart && room.serviceEnd && (
            <div className="mt-2 pt-1.5 border-t border-slate-700/30 flex items-center justify-center gap-1.5">
              <FileText className="w-2.5 h-2.5 text-slate-600" />
              <span className="text-[10px] text-slate-500">
                服务期 <span className="text-slate-400">{room.serviceStart}</span> <span className="text-slate-600">~</span> <span className="text-slate-400">{room.serviceEnd}</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Main Page ===== */
export default function FireControlRoomListPage() {
  const { success } = useToast();
  const [rooms, setRooms] = useState<ControlRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingRoom, setEditingRoom] = useState<ControlRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<ControlRoom | null>(null);

  const PROJECT_NAMES: Record<string, string> = {
    '万达广场商业中心': '万达广场消防项目',
    '兰州大学第二医院': '兰大二院消防改造项目',
    '兰州中心': '兰州中心综合体消防项目',
    '甘肃省博物馆': '省博物馆消防升级项目',
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // 优先从后端 API 加载真实数据
      const res = await httpApi.get<{ list: any[], total: number }>('/control-rooms', { pageSize: 9999 });
      let list: any[] = [];
      if (res.code === 200 && res.data?.list) {
        list = res.data.list;
        console.log('[fetchRooms] API count=', list.length);
      } else {
        // API 失败时 fallback 到本地 IndexedDB
        list = await ControlRoomDAO.getAll();
        console.log('[fetchRooms] DAO fallback count=', list.length);
      }
      let filtered = list.map((r: any) => {
        // 支持后端字段名和本地字段名两种格式
        const id = r.roomId || r.id || '';
        const unitName = r.location?.trim() || r.unitName?.trim() || r.name?.trim() || r.room_name?.trim() || r.unit_name?.trim() || id || '未命名消控室';
        return {
          id,
          unitName,
          projectName: PROJECT_NAMES[unitName] || `${unitName}消防项目`,
          controllerModel: r.model || r.brand || r.hostModel || r.controllerModel || '',
          hostNo: r.hostCode || r.hostNo || '主机1',
          busDevices: r.deviceCount || r.busDevices || 0,
          busPoints: r.busPoints || r.deviceCount || 0,
          multilineDevices: r.multilineDevices || 0,
          multilinePoints: r.multilinePoints || 0,
          serviceStart: r.serviceStart || '',
          serviceEnd: r.serviceEnd || '',
          online: (r.hostStatus === 1 || r.status === 'normal' || r.online === true),
        };
      });
      if (keyword) {
        const q = keyword.toLowerCase();
        filtered = filtered.filter((r: any) =>
          r.unitName.toLowerCase().includes(q) ||
          r.controllerModel.toLowerCase().includes(q) ||
          r.hostNo.toLowerCase().includes(q)
        );
      }
      setRooms(filtered);
    } catch (e: any) {
      console.error('加载消控室失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [page, keyword]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const allSelected = rooms.length > 0 && rooms.every(r => selectedIds.includes(r.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => prev.filter(id => !rooms.find(r => r.id === id)));
    else setSelectedIds(prev => [...new Set([...prev, ...rooms.map(r => r.id)])]);
  };

  const handleAdd = () => { setFormMode('add'); setEditingRoom(null); };
  const handleEdit = (room: ControlRoom) => { setFormMode('edit'); setEditingRoom(room); };

  const handleSave = async (updated: ControlRoom) => {
    try {
      if (formMode === 'add') {
        const before = await ControlRoomDAO.getAll();
        console.log('[handleSave] before create count=', before.length, 'ids=', before.map((r: any) => r.id));
        await ControlRoomDAO.create(updated as any);
        generateRoomData(updated.id, updated as any);
        const after = await ControlRoomDAO.getAll();
        console.log('[handleSave] after create count=', after.length, 'ids=', after.map((r: any) => r.id));
        if (after.length <= before.length) {
          alert('新增失败：数据未写入，请打开浏览器控制台查看日志');
          return;
        }
        success('新增成功', `${updated.unitName} 的消控室已创建`);
      } else {
        await ControlRoomDAO.update(updated.id, updated as any);
        success('保存成功', `${updated.unitName} 的信息已更新`);
      }
      setFormMode(null);
      setEditingRoom(null);
      fetchRooms();
    } catch (e: any) {
      console.error('保存失败', e);
      alert('保存失败: ' + (e.message || e));
    }
  };

  const handleDelete = (room: ControlRoom) => { setDeletingRoom(room); };
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    try {
      await ControlRoomDAO.delete(deletingRoom.id);
      crHostsCache.delete(deletingRoom.id);
      setSelectedIds(prev => prev.filter(id => id !== deletingRoom.id));
      success('删除成功', `${deletingRoom.unitName} 的消控室已删除`);
      setDeletingRoom(null);
      fetchRooms();
    } catch (e: any) {
      console.error('删除失败', e);
      alert('删除失败: ' + (e.message || e));
    }
  };

  const totalPages = Math.ceil(rooms.length / pageSize);
  const paged = rooms.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 p-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex-shrink-0 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Monitor className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">数智消控室</h2>
            <p className="text-[10px] text-slate-500">消防控制室集中管理</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] bg-blue-500/8 text-blue-400 border-blue-500/20 font-medium">
                共{rooms.length}个
              </Badge>
              {selectedIds.length > 0 && (
                <Badge variant="outline" className="text-[9px] bg-emerald-500/8 text-emerald-400 border-emerald-500/20 font-medium">
                  已选{selectedIds.length}个
                </Badge>
              )}
              {loading && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索单位名称/控制器型号" className="pl-8 h-8 w-56 text-xs bg-slate-900/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5 mr-1" />新增
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 px-1">
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/40">
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
            全选
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg p-0.5">
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-md" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
            <ChevronLeft className="w-3 h-3 mr-0.5" />上一页
          </Button>
          <span className="text-[10px] text-slate-500 px-2 font-mono">{page} / {totalPages || 1}</span>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-md" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            下一页<ChevronRight className="w-3 h-3 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paged.map(room => (
            <ControlRoomCard
              key={room.id}
              room={room}
              selected={selectedIds.includes(room.id)}
              onSelect={() => toggleSelect(room.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
        {paged.length === 0 && !loading && (
          <div className="text-center py-20 text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/40 backdrop-blur-sm flex items-center justify-center border border-slate-700/30">
              <Monitor className="w-7 h-7 text-slate-600" />
            </div>
            <span>未找到匹配的消控室</span>
          </div>
        )}
      </div>

      {formMode && (
        <RoomFormModal
          room={editingRoom}
          mode={formMode}
          onSave={handleSave}
          onClose={() => { setFormMode(null); setEditingRoom(null); }}
        />
      )}

      {deletingRoom && (
        <DeleteConfirmModal
          room={deletingRoom}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingRoom(null)}
        />
      )}
    </div>
  );
}
