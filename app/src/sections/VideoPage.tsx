import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video, Maximize2, Grid3X3, LayoutGrid, RefreshCw,
  Wifi, WifiOff, CircleDot
} from 'lucide-react';

const fallbackChannels = [
  { id: 'CAM-001', name: '1F大厅主入口', unit: '万达广场', online: true, rec: true },
  { id: 'CAM-002', name: '1F消防通道', unit: '万达广场', online: true, rec: true },
  { id: 'CAM-003', name: 'B1停车场A区', unit: '万达广场', online: true, rec: false },
  { id: 'CAM-004', name: 'B1停车场B区', unit: '万达广场', online: true, rec: true },
  { id: 'CAM-005', name: '2F商场走廊', unit: '万达广场', online: true, rec: false },
  { id: 'CAM-006', name: '消防泵房', unit: '万达广场', online: true, rec: true },
  { id: 'CAM-007', name: '配电室', unit: '万达广场', online: false, rec: false },
  { id: 'CAM-008', name: '屋顶风机房', unit: '万达广场', online: true, rec: false },
  { id: 'CAM-009', name: '门诊大厅', unit: '兰大二院', online: true, rec: true },
  { id: 'CAM-010', name: '住院部走廊', unit: '兰大二院', online: true, rec: false },
  { id: 'CAM-011', name: '消防控制室', unit: '兰大二院', online: true, rec: true },
  { id: 'CAM-012', name: '食堂后厨', unit: '西北师大', online: true, rec: true },
];

function VideoCell({ ch }: { ch: typeof fallbackChannels[0] }) {
  return (
    <div className={`relative rounded-lg border ${ch.online ? 'border-slate-600/50' : 'border-red-700/30'} bg-slate-900 overflow-hidden group cursor-pointer hover:border-blue-500/40 transition-all`}>
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)' }} />
      {/* Scene */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative">
          {ch.id === 'CAM-001' && (
            <>
              <div className="absolute top-1/2 left-1/4 w-8 h-16 border border-white/5 rounded bg-slate-800/30" />
              <div className="absolute top-1/2 right-1/4 w-12 h-8 border border-white/5 rounded bg-slate-800/30" />
              <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-yellow-500/10 blur-md" />
            </>
          )}
          {ch.id === 'CAM-006' && (
            <>
              <div className="absolute bottom-4 left-4 w-10 h-8 rounded border border-white/5 bg-slate-800/30" />
              <div className="absolute bottom-4 right-4 w-10 h-8 rounded border border-white/5 bg-slate-800/30" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-green-500/20 animate-pulse" />
            </>
          )}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" preserveAspectRatio="none">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
      {/* Overlay */}
      <div className="relative z-20 flex flex-col h-full min-h-[100px]">
        <div className="flex items-center justify-between p-1.5 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-1">
            {ch.online ? <Wifi className="w-2.5 h-2.5 text-emerald-400" /> : <WifiOff className="w-2.5 h-2.5 text-red-400" />}
            {ch.rec && <><CircleDot className="w-2.5 h-2.5 text-red-400 animate-pulse" /><span className="text-[7px] text-red-400 font-bold">REC</span></>}
          </div>
          <span className="text-[8px] text-slate-400 font-mono">{new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span>
        </div>
        <div className="flex-1" />
        <div className="p-1.5 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[8px] text-slate-300 font-medium block">{ch.name}</span>
              <span className="text-[7px] text-slate-500">{ch.unit}</span>
            </div>
            <Badge variant="outline" className={`text-[7px] px-0.5 ${ch.online ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {ch.online ? '在线' : '离线'}
            </Badge>
          </div>
        </div>
      </div>
      {/* Hover: fullscreen icon */}
      <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <Maximize2 className="w-6 h-6 text-white/50" />
      </div>
    </div>
  );
}

export default function VideoPage() {
  const [layout, setLayout] = useState<'4' | '9'>('4');
  const [channels, setChannels] = useState(fallbackChannels as any);

  useEffect(() => {
    legacyApi.monitorOverview().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setChannels(list);
    }).catch(() => {});
  }, []);

  const onlineCount = channels.filter((c: any) => c.online).length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Video className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">视频监控</h2>
            <p className="text-[10px] text-slate-500">视频监控中心</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">{channels.length}路</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">在线{onlineCount}</Badge>
          <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">离线{channels.length - onlineCount}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant={layout === '4' ? 'default' : 'outline'} onClick={() => setLayout('4')} className="h-7 w-7 p-0 text-xs">
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant={layout === '9' ? 'default' : 'outline'} onClick={() => setLayout('9')} className="h-7 w-7 p-0 text-xs">
            <Grid3X3 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300">
            <RefreshCw className="w-3 h-3 mr-1" />刷新
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`grid gap-2 flex-1 min-h-0 ${layout === '4' ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-3 xl:grid-cols-4'}`}>
        {channels.map((ch: any) => (
          <VideoCell key={ch.id} ch={ch} />
        ))}
      </div>

      {/* Bottom Channel Bar */}
      <div className="flex-shrink-0 flex items-center gap-1 p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 overflow-x-auto">
        {channels.map((ch: any, i: number) => (
          <button key={ch.id} className={`flex-shrink-0 px-2 py-1 rounded text-[9px] font-mono transition-all ${ch.online ? 'bg-slate-700/50 text-slate-300 hover:bg-blue-500/30' : 'bg-slate-800/30 text-slate-600'}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
