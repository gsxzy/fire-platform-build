import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Device, MonitorOverview, MultilinePoint, BusPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  VolumeX, RotateCcw, Hand, Shield, Power, Circle, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Flame, Activity, Sliders
} from 'lucide-react';

export default function ControlPage() {
  const [, setOverview] = useState<MonitorOverview | null>(null);
  const [hosts, setHosts] = useState<Device[]>([]);
  const [selectedHost, setSelectedHost] = useState<Device | null>(null);
  const [currentMode, setCurrentMode] = useState<{ currentMode: number; modeName: string } | null>(null);
  const [multilinePoints, setMultilinePoints] = useState<MultilinePoint[]>([]);
  const [busPoints, setBusPoints] = useState<BusPoint[]>([]);
  const [busPage, setBusPage] = useState(1);
  const [silenceDialog, setSilenceDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [modeDialog, setModeDialog] = useState(false);
  const [shieldDialog, setShieldDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shieldReason, setShieldReason] = useState('');
  const [shieldDuration, setShieldDuration] = useState('60');
  const [activeTab, setActiveTab] = useState<'multiline' | 'bus'>('multiline');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [ov, devices]: any = await Promise.all([api.dashboard(), api.getDevices({ deviceTypeId: '4', size: 100 })]);
      setOverview(ov); setHosts((devices as any).list);
      if ((devices as any).list.length > 0 && !selectedHost) setSelectedHost((devices as any).list[0]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (selectedHost) loadHostData(); }, [selectedHost]);

  const loadHostData = async () => {
    if (!selectedHost) return;
    try {
      const [mode, _mlp]: any = await Promise.all([api.getControlRooms(), api.getMultilinePanels()]);
      setCurrentMode((mode as any).list?.[0]);
      const pts: any = await api.getMultilinePanels();
      setMultilinePoints(pts);
      const bp: any = await api.getBusPoints();
      setBusPoints((bp as any).list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    api.getBusPoints().then((res: any) => { setBusPoints((res as any).list); });
  }, [busPage]);

  const handleSilence = async () => {
    if (!selectedHost) return; setLoading(true);
    try { await api.silenceConfirm({ deviceId: selectedHost.id, deviceCode: selectedHost.device_code, deviceName: selectedHost.device_name }); setSilenceDialog(false); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleReset = async () => {
    if (!selectedHost) return; setLoading(true);
    try { await api.resetConfirm({ deviceId: selectedHost.id, deviceCode: selectedHost.device_code, deviceName: selectedHost.device_name }); setResetDialog(false); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleModeSwitch = async () => {
    if (!selectedHost) return; setLoading(true);
    try { const newMode = currentMode?.currentMode === 2 ? 1 : 2; const res = await api.switchMode({ deviceId: selectedHost.id, deviceCode: selectedHost.device_code, deviceName: selectedHost.device_name, targetMode: newMode }) as { newMode: number; modeName: string }; setCurrentMode({ currentMode: res.newMode, modeName: res.modeName }); setModeDialog(false); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleShield = async () => {
    if (!selectedHost || !shieldReason) return; setLoading(true);
    try { await api.addShield({ deviceId: selectedHost.id, deviceCode: selectedHost.device_code, deviceName: selectedHost.device_name, shieldType: 1, shieldReason: shieldReason, shieldDuration: parseInt(shieldDuration) }); setShieldDialog(false); setShieldReason(''); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const pointTypeColor = (type: number) => {
    switch (type) {
      case 1: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 2: return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 3: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 4: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 5: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };
  const pointTypeName = (type: number) => {
    switch (type) { case 1: return '报警类'; case 2: return '灭火类'; case 3: return '手动'; case 4: return '卷帘'; case 5: return '风阀'; case 6: return '声光'; default: return '其他'; }
  };
  const pointStatusIcon = (status: number) => {
    switch (status) { case 0: return <Circle className="w-3 h-3 text-slate-600" />; case 1: return <CheckCircle className="w-3 h-3 text-emerald-400" />; case 2: return <AlertTriangle className="w-3 h-3 text-yellow-400" />; case 3: return <Flame className="w-3 h-3 text-red-400 animate-pulse" />; default: return <Circle className="w-3 h-3 text-slate-600" />; }
  };
  const busPointTypeName = (type?: number) => { switch (type) { case 1: return '感烟'; case 2: return '感温'; case 3: return '手报'; case 4: return '卷帘'; case 5: return '风阀'; case 6: return '声光'; default: return '模块'; } };

  return (
    <div className="space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Sliders className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">数智消控室</h2>
            <p className="text-[10px] text-slate-500">多线盘/总线盘控制 · 消音/复位/手自动/屏蔽</p>
          </div>
        </div>
        <Select value={selectedHost?.id?.toString() || ''} onValueChange={v => { const h = hosts.find(h => h.id.toString() === v); if (h) setSelectedHost(h); }}>
          <SelectTrigger className="w-64 h-8 text-xs bg-slate-800/60 border-slate-700/40 text-slate-200 rounded-lg"><SelectValue placeholder="选择控制器" /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">{hosts.map(h => <SelectItem key={h.id} value={h.id.toString()} className="text-slate-200">{h.device_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Controller Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div><div className="text-xs text-slate-500">当前模式</div><div className={`text-lg font-bold ${currentMode?.currentMode === 2 ? 'text-emerald-400' : 'text-yellow-400'}`}>{currentMode?.modeName || '自动'}</div></div>
            <Hand className={`w-8 h-8 ${currentMode?.currentMode === 2 ? 'text-emerald-400' : 'text-yellow-400'}`} />
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div><div className="text-xs text-slate-500">设备状态</div><div className="text-lg font-bold text-emerald-400">在线</div></div>
            <Activity className="w-8 h-8 text-emerald-400" />
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div><div className="text-xs text-slate-500">多线盘点位</div><div className="text-lg font-bold text-blue-400">{multilinePoints.length}</div></div>
            <Power className="w-8 h-8 text-blue-400" />
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div><div className="text-xs text-slate-500">总线盘点位</div><div className="text-lg font-bold text-cyan-400">64</div></div>
            <Shield className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>
      </div>

      {/* Emergency Controls */}
      <div className="grid grid-cols-4 gap-3">
        <Button onClick={() => setSilenceDialog(true)} variant="outline" className="h-14 border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 flex flex-col items-center gap-1">
          <VolumeX className="w-5 h-5" /><span className="text-xs">消音</span>
        </Button>
        <Button onClick={() => setResetDialog(true)} variant="outline" className="h-14 border-orange-700/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 flex flex-col items-center gap-1">
          <RotateCcw className="w-5 h-5" /><span className="text-xs">复位</span>
        </Button>
        <Button onClick={() => setModeDialog(true)} variant="outline" className={`h-14 border-blue-700/50 flex flex-col items-center gap-1 ${currentMode?.currentMode === 2 ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-700/50'}`}>
          <Hand className="w-5 h-5" /><span className="text-xs">{currentMode?.currentMode === 2 ? '自动模式' : '手动模式'}</span>
        </Button>
        <Button onClick={() => setShieldDialog(true)} variant="outline" className="h-14 border-yellow-700/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 flex flex-col items-center gap-1">
          <Shield className="w-5 h-5" /><span className="text-xs">屏蔽</span>
        </Button>
      </div>

      {/* Panel Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50 w-fit">
        <button onClick={() => setActiveTab('multiline')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'multiline' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>多线盘</button>
        <button onClick={() => setActiveTab('bus')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'bus' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>总线盘</button>
      </div>

      {/* Multiline Panel */}
      {activeTab === 'multiline' && (
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Power className="w-4 h-4 text-blue-400" /> 多线盘 ({multilinePoints.length}点位)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {multilinePoints.map(point => (
                <div key={point.id} className={`p-3 rounded-lg border ${pointTypeColor(point.point_type)} relative overflow-hidden`}>
                  <div className="absolute top-2 right-2">{pointStatusIcon(point.status)}</div>
                  <div className="text-xs font-mono text-slate-500 mb-1">{point.point_code}</div>
                  <div className="text-sm font-medium text-slate-100 mb-1">{point.point_name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-slate-800/50">{pointTypeName(point.point_type)}</Badge>
                    <span className="text-[10px] text-slate-500 font-mono">Addr:{point.address}</span>
                  </div>
                  {point.linked_device_name && <div className="text-[10px] text-slate-500 mt-1 truncate">{point.linked_device_name}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bus Panel */}
      {activeTab === 'bus' && (
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-slate-300">总线盘 - 回路1</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-slate-200" onClick={() => setBusPage(Math.max(1, busPage - 1))} disabled={busPage <= 1} aria-label="上一页"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs text-slate-400">第{busPage}页</span>
              <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-slate-200" onClick={() => setBusPage(busPage + 1)} aria-label="下一页"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {busPoints.map(point => (
                <div key={point.id} className={`p-2 rounded border text-center ${pointTypeColor((point.point_type as number) || 1)}`}>
                  <div className="text-[10px] font-mono">{point.point_code}</div>
                  <div className="text-xs font-medium truncate">{point.point_name}</div>
                  <div className="text-[10px] opacity-70">{point.address}</div>
                  <Badge variant="outline" className="text-[9px] mt-0.5">{busPointTypeName(point.point_type as number)}</Badge>
                  <div className="flex justify-center mt-0.5">{pointStatusIcon(point.status)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={silenceDialog} onOpenChange={setSilenceDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><VolumeX className="w-5 h-5 text-red-400" /> 消音确认</DialogTitle></DialogHeader>
          <p className="text-slate-400">对 <span className="text-slate-200 font-medium">{selectedHost?.device_name}</span> 执行消音？</p>
          <p className="text-xs text-yellow-500">消音将关闭当前声音报警，不影响后续新报警。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSilenceDialog(false)} className="border-slate-600 text-slate-300">取消</Button>
            <Button onClick={handleSilence} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">{loading ? '执行中...' : '确认消音'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-orange-400" /> 复位确认</DialogTitle></DialogHeader>
          <p className="text-slate-400">对 <span className="text-slate-200 font-medium">{selectedHost?.device_name}</span> 执行复位？</p>
          <p className="text-xs text-yellow-500">复位将清除当前报警状态并恢复系统初始状态。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(false)} className="border-slate-600 text-slate-300">取消</Button>
            <Button onClick={handleReset} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">{loading ? '执行中...' : '确认复位'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modeDialog} onOpenChange={setModeDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Hand className="w-5 h-5 text-blue-400" /> 模式切换</DialogTitle></DialogHeader>
          <p className="text-slate-400">当前: <Badge className={currentMode?.currentMode === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}>{currentMode?.modeName || '自动'}</Badge></p>
          <p className="text-slate-400">切换为: <Badge className={currentMode?.currentMode === 2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}>{currentMode?.currentMode === 2 ? '手动' : '自动'}</Badge></p>
          <p className="text-xs text-yellow-500">手动模式下联动设备不会自动启动。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeDialog(false)} className="border-slate-600 text-slate-300">取消</Button>
            <Button onClick={handleModeSwitch} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">{loading ? '切换中...' : '确认切换'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shieldDialog} onOpenChange={setShieldDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-yellow-400" /> 添加屏蔽</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300">屏蔽设备</Label><div className="text-sm text-slate-200 mt-1">{selectedHost?.device_name}</div></div>
            <div><Label className="text-slate-300">屏蔽原因 <span className="text-red-400">*</span></Label><Input value={shieldReason} onChange={e => setShieldReason(e.target.value)} placeholder="请输入屏蔽原因" className="bg-slate-700 border-slate-600 text-slate-200 mt-1" /></div>
            <div><Label className="text-slate-300">屏蔽时长(分钟)</Label><Input type="number" value={shieldDuration} onChange={e => setShieldDuration(e.target.value)} className="bg-slate-700 border-slate-600 text-slate-200 mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShieldDialog(false)} className="border-slate-600 text-slate-300">取消</Button>
            <Button onClick={handleShield} disabled={loading || !shieldReason} className="bg-yellow-500 hover:bg-yellow-600 text-white">{loading ? '添加中...' : '添加屏蔽'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
