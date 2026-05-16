import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import PageTemplate from '@/sections/PageTemplate';
import { hostDeviceCodeService } from '@/api/services';
import { api as httpApi } from '@/api/client';
import { useToast } from '@/core/ToastContext';
import { FileSpreadsheet, Upload, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import type { QueryParams } from '@/types/db';
import type { ApiService } from '@/hooks/useApiResource';

const statusMap: Record<number, string> = {
  1: '正常',
  2: '故障',
  3: '停用',
};

const statusColorMap: Record<number, string> = {
  1: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  2: 'text-red-400 bg-red-500/10 border-red-500/20',
  3: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const COLUMNS = [
  { key: 'loop_no', label: '回路号', width: '70px' },
  { key: 'point_no', label: '点位号', width: '70px' },
  { key: 'device_type', label: '设备类型', width: '100px' },
  { key: 'device_name', label: '设备名称', width: '140px' },
  { key: 'install_location', label: '安装位置', width: '160px' },
  { key: 'floor', label: '楼层', width: '60px' },
  { key: 'parent_device', label: '父设备', width: '100px' },
  {
    key: 'status',
    label: '状态',
    width: '70px',
    render: (v: unknown) => {
      const status = Number(v);
      const label = statusMap[status] || '未知';
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'loop_no', label: '回路号', type: 'number' as const, required: true },
  { key: 'point_no', label: '点位号', type: 'number' as const, required: true },
  { key: 'device_type', label: '设备类型', type: 'text' as const },
  { key: 'device_name', label: '设备名称', type: 'text' as const },
  { key: 'install_location', label: '安装位置', type: 'text' as const },
  { key: 'floor', label: '楼层', type: 'text' as const },
  { key: 'parent_device', label: '父设备', type: 'text' as const },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '正常', value: '1' },
      { label: '故障', value: '2' },
      { label: '停用', value: '3' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: '1' },
      { label: '故障', value: '2' },
      { label: '停用', value: '3' },
    ],
  },
];

interface HostOption {
  id: string;
  hostName: string;
}

export default function HostDeviceCodePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: showError } = useToast();
  const roomId = searchParams.get('roomId') || '';

  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // 加载消控室名称
  useEffect(() => {
    if (!roomId) return;
    httpApi.get<any>(`/control-rooms/${roomId}`).then(res => {
      if (res.code === 200 && res.data?.room) {
        const r = res.data.room;
        setRoomName(r.room_name || r.name || '消控室');
      }
    });
  }, [roomId]);

  // 加载报警主机列表
  useEffect(() => {
    if (!roomId) {
      setHosts([]);
      return;
    }
    httpApi.get<any[]>('/control-rooms/hosts', { roomId }).then(res => {
      if (res.code === 200 && Array.isArray(res.data)) {
        const list = res.data.map((h: any) => ({
          id: String(h.id),
          hostName: h.host_name || h.name || `主机${h.id}`,
        }));
        setHosts(list);
        if (list.length > 0 && !selectedHostId) {
          setSelectedHostId(list[0].id);
        }
      }
    });
  }, [roomId]);

  const service: ApiService = {
    list: (params: QueryParams) => {
      const query: QueryParams = { ...params };
      if (selectedHostId) query.hostId = selectedHostId;
      else if (roomId) query.roomId = roomId;
      return hostDeviceCodeService.list(query) as any;
    },
    create: hostDeviceCodeService.create as any,
    update: hostDeviceCodeService.update as any,
    delete: hostDeviceCodeService.delete as any,
  };

  const handleImport = useCallback(async (file: File) => {
    const hostId = selectedHostId;
    if (!hostId) {
      showError('请先选择报警主机');
      return;
    }
    setImporting(true);
    try {
      const res = await hostDeviceCodeService.import(hostId, file);
      if (res.code === 200) {
        success(`导入完成：成功 ${(res.data as any)?.success ?? 0} 条`);
      } else {
        showError('导入失败', res.message || '未知错误');
      }
    } catch (e: unknown) {
      showError('导入失败', e instanceof Error ? e.message : '网络错误');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedHostId, showError, success]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImport(file);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between flex-shrink-0 glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/monitor/control')}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-600/30"
            title="返回"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-subhead font-bold text-slate-100">
              报警主机编码表
              {roomName && <span className="text-xs font-normal text-slate-500 ml-2">· {roomName}</span>}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {roomId && (
            <select
              value={selectedHostId}
              onChange={e => setSelectedHostId(e.target.value)}
              className="h-8 text-xs bg-slate-700/50 border border-slate-600/40 text-slate-200 rounded-lg px-2 outline-none focus:border-blue-500/40"
            >
              <option value="">全部主机</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.hostName}</option>
              ))}
            </select>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-emerald-400 rounded-lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {importing ? '导入中…' : 'Excel导入'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-blue-400 rounded-lg"
            onClick={() => {
              const template = `回路号,点位号,设备类型,设备名称,安装位置,楼层,父设备,状态\n1,1,感烟探测器,1楼走廊烟感,1楼走廊,1,报警主机,正常\n1,2,手动报警按钮,1楼大厅手报,1楼大厅,1,报警主机,正常\n`;
              const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = '报警主机编码表导入模板.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            下载模板
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <PageTemplate
        title=""
        showHeader={false}
        columns={COLUMNS}
        service={service}
        fields={FIELDS}
        filterFields={FILTER_FIELDS}
        actions
        addable
        batchable
        searchable
        exportable
        printable
        refreshable
        filterable
        pageSize={15}
        emptyTitle="暂无编码数据"
        emptyDescription="请通过「Excel导入」批量导入，或点击「新增」手动添加单条记录"
        formInitialDefaults={{ status: '1' }}
      />
    </div>
  );
}
