import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/core/ToastContext';
import { ControlRoomDAO } from '@/db/Database';
import { api as httpApi } from '@/api/client';
import { getErrorMessage } from '@/types/api';
import EmptyState from '@/components/EmptyState';
import {
  Search, ChevronLeft, ChevronRight,
  Monitor, CheckSquare, Square, Plus, Loader2,
} from 'lucide-react';
import RoomFormModal from './fireControlRoomList/components/RoomFormModal';
import DeleteConfirmModal from './fireControlRoomList/components/DeleteConfirmModal';
import ControlRoomCard from './fireControlRoomList/components/ControlRoomCard';
import type { ControlRoom } from './fireControlRoomList/types';

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
  const [units, setUnits] = useState<Array<{id: string|number; name: string}>>([]);

  useEffect(() => {
    httpApi.get<any>('/units/list', { pageSize: 500 }).then(res => {
      if (res.code === 200 && Array.isArray(res.data?.list)) {
        setUnits(res.data.list.map((u: any) => ({ id: u.id, name: u.name || u.unit_name || '未命名' })));
      }
    });
  }, []);

  const PROJECT_NAMES: Record<string, string> = {};

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await httpApi.get<{ list: any[], total: number }>('/control-rooms', { pageSize: 9999 });
      let list: any[] = [];
      if (res.code === 200 && res.data?.list) {
        list = res.data.list;
      } else {
        list = await ControlRoomDAO.getAll();
      }
      let filtered = list.map((r: any) => {
        const id = String(r.roomId || r.id || '');
        const unitName = r.unitName?.trim() || r.room_name?.trim() || r.unit_name?.trim() || r.name?.trim() || id || '未命名消控室';
        return {
          id,
          unitName,
          unitId: r.unit_id ? String(r.unit_id) : undefined,
          projectName: PROJECT_NAMES[unitName] || `${unitName}消防项目`,
          controllerModel: r.controllerModel || r.host_model || r.hostModel || r.model || r.brand || '',
          hostNo: r.hostNo || r.host_no || r.hostCode || '主机1',
          busDevices: r.busDevices || r.device_count || 0,
          busPoints: r.busPoints || r.loop_count || 0,
          multilineDevices: r.multilineDevices || 0,
          multilinePoints: r.multilinePoints || 0,
          serviceStart: r.serviceStart || '',
          serviceEnd: r.serviceEnd || '',
          online: (r.hostStatus === 1 || r.status === 1 || r.status === 'normal' || r.online === true),
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
    } catch (e: unknown) {
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

  const handleSave = async (updated: ControlRoom & { unitId?: string }) => {
    try {
      const payload = {
        room_name: updated.unitName,
        unit_name: updated.unitName,
        unit_id: updated.unitId ? parseInt(updated.unitId) : null,
        duty_person: '',
        duty_phone: '',
        status: 1,
        controllerModel: updated.controllerModel,
        hostNo: updated.hostNo,
        host_model: updated.controllerModel,
        host_no: updated.hostNo,
      };
      if (formMode === 'add') {
        const res = await httpApi.post<{id: number}>('/control-rooms', payload);
        if (res.code === 200) {
          success('新增成功', `${updated.unitName} 的消控室已创建`);
        } else {
          alert('新增失败: ' + (res.msg || '未知错误'));
          return;
        }
      } else {
        await httpApi.put(`/control-rooms/${updated.id}`, payload);
        success('保存成功', `${updated.unitName} 的信息已更新`);
      }
      setFormMode(null);
      setEditingRoom(null);
      fetchRooms();
    } catch (e: unknown) {
      console.error('保存失败', e);
      alert('保存失败: ' + getErrorMessage(e, String(e)));
    }
  };

  const handleDelete = (room: ControlRoom) => { setDeletingRoom(room); };
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    try {
      await httpApi.delete(`/control-rooms/${deletingRoom.id}`);
      setSelectedIds(prev => prev.filter(id => id !== deletingRoom.id));
      success('删除成功', `${deletingRoom.unitName} 的消控室已删除`);
      setDeletingRoom(null);
      fetchRooms();
    } catch (e: unknown) {
      console.error('删除失败', e);
      alert('删除失败: ' + getErrorMessage(e, String(e)));
    }
  };

  const totalPages = Math.ceil(rooms.length / pageSize);
  const paged = rooms.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 p-1">
      {/* Header */}
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="text-[11px] text-slate-500">正在同步消控室列表…</span>
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
          <EmptyState
            type={keyword.trim() ? 'search' : 'data'}
            title={keyword.trim() ? '未找到匹配的消控室' : '暂无消控室档案'}
            description={
              keyword.trim()
                ? '请尝试修改搜索关键词，或清空搜索后查看全部列表。'
                : '请先使用「新增」登记消控室并绑定联网单位；若已与后端同步仍为空，请检查接口权限与网络。'
            }
            icon={Monitor}
            className="py-16"
          />
        )}
      </div>

      {formMode && (
        <RoomFormModal
          room={editingRoom}
          mode={formMode}
          units={units}
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
