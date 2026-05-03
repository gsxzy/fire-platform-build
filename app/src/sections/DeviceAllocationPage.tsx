import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useToast } from '@/core/ToastContext';
import { deviceAllocationService, unitService } from '@/api/services';
import {
  ArrowRightLeft, Building2, CheckSquare, Square, Search,
  Package, ChevronRight, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface DeviceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  protocol_type: string;
}

interface UnitItem {
  id: string;
  name: string;
  type: string;
  address: string;
}

const categoryLabel: Record<string, string> = {
  detector: '探测器', button: '手报', pump: '消防泵', fan: '风机',
  host: '报警主机', camera: '摄像头', 'gb28181-camera': '国标摄像头',
  water: '水源监测', electrical: '电气火灾', 'smoke-exhaust': '防排烟',
  lighting: '应急照明', broadcast: '广播', elevator: '电梯',
  controller: '控制器', monitor: '监控器', sensor: '传感器',
  'fire-controller': '火灾报警控制器', 'iot-sensor': 'IoT传感器',
  'elec-monitor': '电气监测', 'pressure-sensor': '压力传感器',
  'fan-controller': '风机控制', 'level-sensor': '液位传感器',
  'user-transmission-device': '用户信息传输装置',
};

export default function DeviceAllocationPage() {
  const [searchParams] = useSearchParams();
  const preselectDeviceId = searchParams.get('deviceId');
  const { success, error } = useToast();

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [unitKeyword, setUnitKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    fetchUnallocated();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (preselectDeviceId) {
      setSelectedDevices(new Set([preselectDeviceId]));
    }
  }, [preselectDeviceId]);

  const fetchUnallocated = async () => {
    setLoading(true);
    try {
      const res = await deviceAllocationService.listUnallocated({ pageSize: 9999 });
      const list = res.data?.list || [];
      setDevices(list);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await unitService.list({ pageSize: 9999 });
      const list = res.data?.list || [];
      setUnits(list.filter((u: any) => parseInt(u.status, 10) === 1));
    } catch {
      setUnits([]);
    }
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const visible = filteredDevices.map(d => d.id);
    const allSelected = visible.every(id => selectedDevices.has(id));
    setSelectedDevices(prev => {
      const next = new Set(prev);
      visible.forEach(id => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const filteredDevices = devices.filter(d =>
    !keyword || d.name.includes(keyword) || d.code.includes(keyword) || d.category.includes(keyword)
  );

  const filteredUnits = units.filter(u =>
    !unitKeyword || u.name.includes(unitKeyword) || u.address.includes(unitKeyword)
  );

  const handleAllocate = async () => {
    if (selectedDevices.size === 0) {
      error('请选择至少一台设备');
      return;
    }
    if (!selectedUnit) {
      error('请选择目标单位');
      return;
    }
    setAllocating(true);
    try {
      const res = await deviceAllocationService.allocate({
        deviceIds: Array.from(selectedDevices),
        unit_id: selectedUnit,
      });
      if (res.code === 200) {
        success('分配成功', `已成功分配 ${res.data?.allocatedCount || selectedDevices.size} 台设备`);
        setSelectedDevices(new Set());
        setSelectedUnit('');
        setStep(1);
        fetchUnallocated();
      } else {
        error(res.message || '分配失败');
      }
    } catch (e: any) {
      error(e?.message || '分配请求失败');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备分配</h2>
            <p className="text-[10px] text-slate-500">将未分配档案绑定到具体消防单位</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/30 rounded border border-slate-600/30">
            <span className="text-[10px] text-slate-400">当前步骤:</span>
            <span className="text-[10px] text-blue-400 font-medium">{step === 1 ? 'Step 1 选择设备' : 'Step 2 选择单位并确认'}</span>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 px-1">
        <button onClick={() => setStep(1)} className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${step === 1 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-800/30 border-slate-700/30 text-slate-500 hover:border-slate-600/30'}`}>
          <Package className="w-4 h-4" />
          <span className="text-xs font-medium">1. 选择未分配设备</span>
          {selectedDevices.size > 0 && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">已选 {selectedDevices.size} 台</span>}
        </button>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <button onClick={() => selectedDevices.size > 0 && setStep(2)} className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${step === 2 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : selectedDevices.size > 0 ? 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:border-slate-600/30' : 'bg-slate-800/20 border-slate-700/20 text-slate-600 cursor-not-allowed'}`}>
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-medium">2. 选择目标单位</span>
        </button>
      </div>

      {step === 1 ? (
        <div className="flex-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="p-3 border-b border-slate-700/30 flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleAll} className="text-[10px] px-2.5 py-1.5 rounded bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 transition-colors flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />全选/取消
            </button>
            <div className="h-4 w-px bg-slate-700" />
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索设备编码/名称/类型" className="bg-slate-700/30 border border-slate-600/30 rounded pl-6 pr-2 py-1 text-[10px] text-slate-200 outline-none w-48" />
            </div>
            <span className="text-[10px] text-slate-500 ml-auto">共 {filteredDevices.length} 台未分配设备</span>
          </div>

          {/* Device Table */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-xs">加载中...</div>
            ) : filteredDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                <Package className="w-8 h-8 opacity-30" />
                <span className="text-xs">暂无未分配设备</span>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDevices.map(d => {
                  const checked = selectedDevices.has(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleDevice(d.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checked ? 'border-blue-500/30 bg-blue-500/8' : 'border-slate-700/20 bg-slate-800/20 hover:bg-slate-700/15 hover:border-slate-600/30'}`}
                    >
                      <div className="flex-shrink-0">
                        {checked ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-5 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">设备编码</span>
                          <span className="text-slate-300 font-mono">{d.code}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">设备名称</span>
                          <span className="text-slate-200 font-medium">{d.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">类型</span>
                          <span className="text-slate-300">{categoryLabel[d.category] || d.category}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">厂商/型号</span>
                          <span className="text-slate-300">{d.manufacturer || '-'} / {d.model || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">协议</span>
                          <span className="text-slate-300">{d.protocol_type || '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700/30 flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-slate-500">已选择 <span className="text-blue-400 font-medium">{selectedDevices.size}</span> 台设备</span>
            <button
              onClick={() => selectedDevices.size > 0 && setStep(2)}
              disabled={selectedDevices.size === 0}
              className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1"
            >
              下一步<ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Unit Selection */}
          <div className="flex-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-700/30 flex items-center gap-2 flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">选择目标单位</span>
              <div className="relative ml-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <input value={unitKeyword} onChange={e => setUnitKeyword(e.target.value)} placeholder="搜索单位名称/地址" className="bg-slate-700/30 border border-slate-600/30 rounded pl-6 pr-2 py-1 text-[10px] text-slate-200 outline-none w-44" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
              {filteredUnits.map(u => {
                const active = selectedUnit === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUnit(u.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${active ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-700/20 bg-slate-800/20 hover:bg-slate-700/15 hover:border-slate-600/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-200 font-medium">{u.name}</span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{u.address || '-'}</div>
                  </div>
                );
              })}
              {filteredUnits.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
                  <Building2 className="w-6 h-6 opacity-30" />
                  <span className="text-xs">无可用单位</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary & Confirm */}
          <div className="w-80 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-700/30">
              <span className="text-xs text-slate-300 font-medium">分配确认</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              <div className="text-[10px] text-slate-500">待分配设备（{selectedDevices.size} 台）</div>
              <div className="space-y-1">
                {Array.from(selectedDevices).map(id => {
                  const d = devices.find(dev => dev.id === id);
                  if (!d) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-slate-700/20">
                      <Package className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-300 truncate">{d.name}</span>
                      <span className="text-slate-500 font-mono ml-auto">{d.code}</span>
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-slate-700/30 my-2" />

              <div className="text-[10px] text-slate-500">目标单位</div>
              {selectedUnit ? (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-blue-300 font-medium">{units.find(u => u.id === selectedUnit)?.name}</div>
                  <div className="text-[10px] text-blue-400/60 mt-0.5">{units.find(u => u.id === selectedUnit)?.address}</div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                  <AlertTriangle className="w-3 h-3" />尚未选择目标单位
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-700/30 flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 text-xs px-3 py-1.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-700/30 transition-colors">上一步</button>
              <button
                onClick={handleAllocate}
                disabled={allocating || !selectedUnit}
                className="flex-1 text-xs px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors"
              >
                {allocating ? '分配中...' : '确认分配'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
