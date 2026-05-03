import { useState, useEffect } from 'react';
import { deviceService } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Cpu, Play, Square, RotateCcw, VolumeX,
  Wifi, WifiOff, CheckCircle,
  Sliders, Zap, Droplets, Wind
} from 'lucide-react';

const fallbackDeviceList = [
  { id: 1, name: '火灾报警控制器', code: 'CTL-001', unit: '万达广场', type: 'controller', online: true, running: true, mode: 2, silence: false },
  { id: 2, name: '消防水泵#1', code: 'PUMP-001', unit: '万达广场', type: 'pump', online: true, running: true, mode: 2, silence: false },
  { id: 3, name: '消防水泵#2', code: 'PUMP-002', unit: '万达广场', type: 'pump', online: true, running: false, mode: 2, silence: false },
  { id: 4, name: '喷淋泵#1', code: 'SPP-001', unit: '万达广场', type: 'pump', online: true, running: false, mode: 2, silence: false },
  { id: 5, name: '排烟风机#1', code: 'FAN-001', unit: '万达广场', type: 'fan', online: true, running: true, mode: 2, silence: false },
  { id: 6, name: '排烟风机#2', code: 'FAN-002', unit: '万达广场', type: 'fan', online: true, running: false, mode: 2, silence: false },
  { id: 7, name: '正压送风机#1', code: 'SAF-001', unit: '万达广场', type: 'fan', online: true, running: true, mode: 2, silence: false },
  { id: 8, name: '电气火灾监控器', code: 'ELEC-001', unit: '万达广场', type: 'monitor', online: true, running: true, mode: 2, silence: false },
  { id: 9, name: '应急照明控制器', code: 'EL-001', unit: '万达广场', type: 'controller', online: false, running: false, mode: 2, silence: false },
  { id: 10, name: '防火卷帘控制器', code: 'SC-001', unit: '万达广场', type: 'controller', online: true, running: true, mode: 2, silence: false },
];

const typeIcon = (type: string) => {
  switch (type) {
    case 'controller': return <Cpu className="w-4 h-4 text-blue-400" />;
    case 'pump': return <Droplets className="w-4 h-4 text-cyan-400" />;
    case 'fan': return <Wind className="w-4 h-4 text-emerald-400" />;
    case 'monitor': return <Zap className="w-4 h-4 text-yellow-400" />;
    default: return <Cpu className="w-4 h-4 text-slate-400" />;
  }
};

export default function ControlPanelPage() {
  const [devices, setDevices] = useState(fallbackDeviceList as any);

  useEffect(() => {
    deviceService.list().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setDevices(list);
    }).catch(() => {});
  }, []);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [controlDialog, setControlDialog] = useState(false);
  const [controlAction, setControlAction] = useState('');
  const [batchMode, setBatchMode] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const allSelected = devices.length > 0 && devices.every((d: any) => selectedIds.includes(d.id));
  void allSelected;
  const toggleAll = () => {
    const allSel = devices.length > 0 && devices.every((d: any) => selectedIds.includes(d.id));
    if (allSel) setSelectedIds([]);
    else setSelectedIds((devices as any).map((d: any) => d.id));
  };
  void toggleAll;

  const openControl = (action: string) => { setControlAction(action); setControlDialog(true); };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Sliders className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备控制</h2>
            <p className="text-[10px] text-slate-500">消防设备远程控制面板</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">{devices.length}台</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            在线{devices.filter((d: any) => d.online).length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>批量模式</span>
            <Switch checked={batchMode} onCheckedChange={setBatchMode} />
          </div>
          {batchMode && selectedIds.length > 0 && (
            <>
              <Button size="sm" onClick={() => openControl('start')} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700"><Play className="w-3 h-3 mr-0.5" />批量启动</Button>
              <Button size="sm" onClick={() => openControl('stop')} variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300"><Square className="w-3 h-3 mr-0.5" />批量停止</Button>
            </>
          )}
        </div>
      </div>

      {/* Device Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(devices as any).map((d: any) => (
            <Card key={d.id} className={`border ${d.online ? 'border-slate-700/50' : 'border-slate-700/20 opacity-60'} bg-slate-800/50 transition-all hover:border-blue-500/30`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {batchMode && (
                      <button onClick={() => toggleSelect(d.id)} className="text-slate-400 hover:text-blue-400 transition-colors">
                        {selectedIds.includes(d.id) ? <CheckCircle className="w-4 h-4 text-blue-500" /> : <div className="w-4 h-4 rounded border border-slate-600" />}
                      </button>
                    )}
                    {typeIcon(d.type)}
                    <span className="text-xs font-medium text-slate-200">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.online ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                    <Badge variant="outline" className={`text-[8px] px-1 ${d.online ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-500'}`}>
                      {d.online ? '在线' : '离线'}
                    </Badge>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mb-2">{d.code} | {d.unit}</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${d.running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className="text-[10px] text-slate-400">{d.running ? '运行中' : '已停止'}</span>
                  <Badge variant="outline" className={`text-[8px] ml-auto ${d.mode === 2 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                    {d.mode === 2 ? '自动' : '手动'}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <Button size="sm" disabled={!d.online || d.running} onClick={() => openControl('start')} className="h-7 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 p-0"><Play className="w-3 h-3 mr-0.5" />启动</Button>
                  <Button size="sm" disabled={!d.online || !d.running} onClick={() => openControl('stop')} variant="outline" className="h-7 text-[9px] border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 p-0"><Square className="w-3 h-3 mr-0.5" />停止</Button>
                  <Button size="sm" disabled={!d.online} onClick={() => openControl('silence')} variant="outline" className="h-7 text-[9px] border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 p-0"><VolumeX className="w-3 h-3 mr-0.5" />消音</Button>
                  <Button size="sm" disabled={!d.online} onClick={() => openControl('reset')} variant="outline" className="h-7 text-[9px] border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 p-0"><RotateCcw className="w-3 h-3 mr-0.5" />复位</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Control Dialog */}
      <Dialog open={controlDialog} onOpenChange={setControlDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm">
          <DialogHeader><DialogTitle className="text-base">
            {controlAction === 'start' && <span className="flex items-center gap-2"><Play className="w-5 h-5 text-emerald-400" />启动确认</span>}
            {controlAction === 'stop' && <span className="flex items-center gap-2"><Square className="w-5 h-5 text-orange-400" />停止确认</span>}
            {controlAction === 'silence' && <span className="flex items-center gap-2"><VolumeX className="w-5 h-5 text-yellow-400" />消音确认</span>}
            {controlAction === 'reset' && <span className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-blue-400" />复位确认</span>}
          </DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">
            {batchMode && selectedIds.length > 0
              ? <>确认对选中的 <span className="text-slate-200 font-bold">{selectedIds.length}</span> 台设备执行操作？</>
              : <>确认执行此操作？</>
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlDialog(false)} className="h-8 text-xs border-slate-600 text-slate-300">取消</Button>
            <Button onClick={() => setControlDialog(false)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">确认执行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
