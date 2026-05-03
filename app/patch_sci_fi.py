import re

with open('src/sections/FireControlRoomPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new states after cameras state
old_cameras_state = '''  const [cameras, setCameras] = useState<VideoCamera[]>([]);
  const [activeCamera, setActiveCamera] = useState(0);'''

new_cameras_state = '''  const [cameras, setCameras] = useState<VideoCamera[]>([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [linkedCameraId, setLinkedCameraId] = useState<number | null>(null);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);'''

content = content.replace(old_cameras_state, new_cameras_state)

# 2. Replace the entire IoT/Video toggle panel section
old_iot_panel = '''            {/* IoT / Video Toggle Panel */}
            <div className="flex-1 fire-card p-2 flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
                    {rightPanelMode === 'gauges' ? <Gauge className="w-3 h-3 text-emerald-400" /> : <Video className="w-3 h-3 text-blue-400" />}
                  </div>
                  <span className="text-[10px] text-slate-300 font-semibold">{rightPanelMode === 'gauges' ? '物联监测' : '视频监控'}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900/60 rounded-lg p-0.5">
                  <button onClick={() => setRightPanelMode('gauges')} className={`text-[9px] px-2 py-1 rounded-md transition-all font-medium ${rightPanelMode === 'gauges' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>压力液位</button>
                  <button onClick={() => setRightPanelMode('video')} className={`text-[9px] px-2 py-1 rounded-md transition-all font-medium ${rightPanelMode === 'video' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>视频</button>
                </div>
              </div>
              {rightPanelMode === 'gauges' ? (
                <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
                  <PressureGauge label="管网压力" value={realtime.pressure_1} unit="MPa" max={1} />
                  <PressureGauge label="喷淋压力" value={realtime.pressure_2} unit="MPa" max={1} />
                  <LiquidLevel label="水箱液位" value={realtime.liquid_level_1} unit="m" max={5} />
                  <LiquidLevel label="消防水池" value={realtime.liquid_level_2} unit="m" max={5} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 gap-2">
                  <div
                    onClick={() => cameras[activeCamera]?.status === 1 && openVideo(cameras[activeCamera])}
                    className={`flex-1 rounded-lg border border-slate-700/30 bg-slate-800/40 flex flex-col items-center justify-center gap-2 ${cameras[activeCamera]?.status === 1 ? 'cursor-pointer hover:border-blue-500/40 hover:bg-slate-800/60 transition-all' : 'cursor-default'}`}
                  >
                    {cameras.length > 0 && cameras[activeCamera]?.status === 1 ? (
                      <>
                        <Play className="w-6 h-6 text-blue-400/60" />
                        <span className="text-xs text-slate-300">{cameras[activeCamera]?.cameraName || '视频监控'}</span>
                        <span className="text-[10px] text-slate-500">{cameras[activeCamera]?.position || ''}</span>
                        <span className="text-[9px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">在线 · 点击播放</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-6 h-6 text-slate-600" />
                        <span className="text-xs text-slate-500">暂无视频信号</span>
                      </>
                    )}
                  </div>
                  {cameras.length > 1 && (
                    <div className="flex items-center justify-center gap-1 flex-shrink-0">
                      {cameras.map((cam, i) => (
                        <button key={cam.id} onClick={() => setActiveCamera(i)}
                          className={`text-[9px] px-2 py-1 rounded-md transition-all ${activeCamera === i ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>
                          {cam.cameraNo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>'''

new_iot_panel = '''            {/* IoT / Video Panel */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {rightPanelMode === 'gauges' ? (
                <SciFiGaugePanel
                  realtime={realtime}
                  onSwitchVideo={() => setRightPanelMode('video')}
                />
              ) : (
                <div className="flex-1 fire-card flex flex-col gap-2 min-h-0 p-2">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-slate-300 font-semibold">视频监控</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCameraSettingsOpen(true)} className="text-[9px] px-2 py-1 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />设置
                      </button>
                      <button onClick={() => setRightPanelMode('gauges')} className="text-[9px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20">物联监测</button>
                    </div>
                  </div>
                  {/* Video Display Area */}
                  {linkedCameraId && cameras.find(c => c.id === linkedCameraId)?.status === 1 ? (
                    <div className="flex-1 rounded-lg border border-blue-500/30 bg-slate-900/60 relative overflow-hidden flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover rounded-lg"
                        controls
                        muted
                        autoPlay
                        playsInline
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-pulse-green" />
                        <span className="text-[9px] text-slate-300">{cameras.find(c => c.id === linkedCameraId)?.cameraName}</span>
                      </div>
                      <button
                        onClick={() => { setLinkedCameraId(null); if (videoRef.current) { videoRef.current.pause(); videoRef.current.removeAttribute('src'); videoRef.current.load(); } }}
                        className="absolute top-2 right-2 w-5 h-5 rounded bg-slate-900/80 border border-slate-700/50 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                      >
                        <XCircle className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-lg border border-slate-700/30 bg-slate-800/40 flex flex-col items-center justify-center gap-2">
                      <Monitor className="w-8 h-8 text-slate-600" />
                      <span className="text-xs text-slate-500">
                        {linkedCameraId ? '关联摄像头离线' : '未设置关联摄像头'}
                      </span>
                      <button onClick={() => setCameraSettingsOpen(true)} className="text-[10px] px-3 py-1 bg-blue-500/15 text-blue-400 rounded-md hover:bg-blue-500/25 transition-all border border-blue-500/20">
                        {linkedCameraId ? '重新设置' : '点击设置'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>'''

content = content.replace(old_iot_panel, new_iot_panel)

# 3. Add videoRef import and state
old_imports = '''import {
  VolumeX, RotateCcw, Shield, CheckCircle, Hand,
  Flame, AlertTriangle, Play, Square, Eye,
  Zap, Activity, HardDrive, Phone, User, MapPin,
  BellOff, Settings2, Users, Monitor, Clock,
  RefreshCw, Wifi, WifiOff, Radio, CheckCircle2, XCircle,
  Video, LogIn, Gauge
} from 'lucide-react';'''

new_imports = '''import {
  VolumeX, RotateCcw, Shield, CheckCircle, Hand,
  Flame, AlertTriangle, Play, Square, Eye,
  Zap, Activity, HardDrive, Phone, User, MapPin,
  BellOff, Settings2, Users, Monitor, Clock,
  RefreshCw, Wifi, WifiOff, Radio, CheckCircle2, XCircle,
  Video, LogIn, Gauge, Cog
} from 'lucide-react';'''

content = content.replace(old_imports, new_imports)

# 4. Add videoRef after logsRef
old_logs_ref = '''  const logsRef = useRef<HTMLDivElement>(null);'''
new_logs_ref = '''  const logsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);'''

content = content.replace(old_logs_ref, new_logs_ref)

# 5. Replace PressureGauge with SciFi version
old_pg_func = '''function PressureGauge({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180 - 90;
  const uid = `pg-${label.replace(/\\s/g, '')}`;
  const zoneColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-emerald-500/20 hover:scale-[1.01] group">
      <svg viewBox="0 0 60 40" className="w-full h-10">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(16,185,129,0.15)"/><stop offset="50%" stopColor="rgba(245,158,11,0.15)"/><stop offset="100%" stopColor="rgba(239,68,68,0.15)"/>
          </linearGradient>
        </defs>
        <path d="M5 35 A25 25 0 0 1 55 35" fill="none" stroke={`url(#${uid}-bg)`} strokeWidth="5" />
        <path d="M5 35 A25 25 0 0 1 20 12.5" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d="M20 12.5 A25 25 0 0 1 40 12.5" fill="none" stroke="rgba(245,158,11,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d="M40 12.5 A25 25 0 0 1 55 35" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeDasharray="2,2" />
        <path d={`M5 35 A25 25 0 0 1 ${5 + 50 * (pct/100)} ${35 - 25 * Math.sin(Math.PI * (pct/100))}`} fill="none" stroke={zoneColor} strokeWidth="4" strokeLinecap="round" />
        <line x1="30" y1="35" x2="30" y2="15" stroke={zoneColor} strokeWidth="2" transform={`rotate(${angle} 30 35)`} />
        <circle cx="30" cy="35" r="3" fill="#475669" />
        <text x="5" y="38" fontSize="4" fill="rgba(16,185,129,0.5)">0</text>
        <text x="54" y="38" fontSize="4" fill="rgba(239,68,68,0.5)">{max}</text>
      </svg>
      <span className="text-[11px] font-bold" style={{ color: zoneColor }}>{value?.toFixed(2) || '0.00'}</span>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}'''

new_pg_func = '''function SciFiGauge({ label, value, unit, max, color }: { label: string; value: number; unit: string; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 28;
  const cx = 32;
  const cy = 34;
  const startAngle = 135;
  const endAngle = 405;
  const angle = startAngle + (pct / 100) * (endAngle - startAngle);
  const rad = (angle * Math.PI) / 180;
  const nx = cx + radius * Math.cos(rad);
  const ny = cy + radius * Math.sin(rad);
  const zoneColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : color;
  const circumference = 2 * Math.PI * radius * ((endAngle - startAngle) / 360);
  const dashArray = `${(pct / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center justify-center gap-1 relative">
      <svg viewBox="0 0 64 44" className="w-full h-12">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={zoneColor} stopOpacity="0.8" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 1 1 ${cx + radius * Math.cos((endAngle * Math.PI) / 180)} ${cy + radius * Math.sin((endAngle * Math.PI) / 180)}`}
          fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6" strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 ${angle > startAngle + 180 ? 1 : 0} 1 ${nx} ${ny}`}
          fill="none" stroke={`url(#grad-${label})`} strokeWidth="6" strokeLinecap="round" filter={`url(#glow-${label})`} />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map(t => {
          const ta = startAngle + (t / 100) * (endAngle - startAngle);
          const tr = (ta * Math.PI) / 180;
          const tx1 = cx + (radius - 4) * Math.cos(tr);
          const ty1 = cy + (radius - 4) * Math.sin(tr);
          const tx2 = cx + (radius + 2) * Math.cos(tr);
          const ty2 = cy + (radius + 2) * Math.sin(tr);
          return <line key={t} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="rgba(148,163,184,0.3)" strokeWidth="0.5" />;
        })}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill={zoneColor} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={cx + (radius - 8) * Math.cos(rad)} y2={cy + (radius - 8) * Math.sin(rad)}
          stroke={zoneColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Value text */}
        <text x={cx} y={cy + 6} className="sci-fi-value" fill={zoneColor}>{value?.toFixed(2) || '0.00'}</text>
        <text x={cx} y={cy + 11} className="sci-fi-unit">{unit}</text>
      </svg>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}

function SciFiGaugePanel({ realtime, onSwitchVideo }: { realtime: RealtimeData; onSwitchVideo: () => void }) {
  return (
    <div className="flex-1 sci-fi-panel rounded-xl p-2 flex flex-col gap-2 min-h-0 relative">
      <div className="sci-fi-corner-br" />
      <div className="sci-fi-scan-line" />
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 bg-cyan-400/60 rounded-full" />
          <span className="text-[10px] text-cyan-300 font-bold tracking-wider sci-fi-text">SENSOR_DATA</span>
          <span className="text-[8px] text-cyan-500/50 px-1.5 py-0.5 bg-cyan-500/5 rounded border border-cyan-500/10">LIVE</span>
        </div>
        <button onClick={onSwitchVideo} className="text-[9px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 flex items-center gap-1">
          <Video className="w-3 h-3" />视频
        </button>
      </div>
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      {/* Gauges */}
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 relative z-10">
        <SciFiGauge label="管网压力" value={realtime.pressure_1} unit="MPa" max={1} color="#10b981" />
        <SciFiGauge label="喷淋压力" value={realtime.pressure_2} unit="MPa" max={1} color="#3b82f6" />
        <SciFiGauge label="水箱液位" value={realtime.liquid_level_1} unit="m" max={5} color="#06b6d4" />
        <SciFiGauge label="消防水池" value={realtime.liquid_level_2} unit="m" max={5} color="#8b5cf6" />
      </div>
      {/* Bottom data strip */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/40 rounded border border-slate-700/20 flex-shrink-0 relative z-10">
        <span className="text-[8px] text-slate-500 sci-fi-text">HOST_ID: {realtime.host_status === 1 ? 'ONLINE' : 'OFFLINE'}</span>
        <span className="text-[8px] text-slate-500 sci-fi-text">MODE: {realtime.current_mode === 2 ? 'AUTO' : 'MANUAL'}</span>
      </div>
    </div>
  );
}'''

content = content.replace(old_pg_func, new_pg_func)

# 6. Replace LiquidLevel with placeholder (not used anymore but keep for compatibility)
old_ll_func = '''function LiquidLevel({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const zoneColor = pct < 20 ? '#ef4444' : pct > 90 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-blue-500/20 hover:scale-[1.01] group">
      <div className="w-8 h-14 border-2 border-slate-600 rounded-lg relative overflow-hidden bg-slate-900/50">
        <div className="absolute top-0 left-0 right-0 h-[20%] border-b border-dashed border-red-500/30" />
        <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-dashed border-red-500/30" />
        <div className="absolute top-[20%] bottom-[20%] left-0 right-0 border-t border-b border-dashed border-emerald-500/20" />
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${zoneColor}60, ${zoneColor}30)` }} />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-[8px] font-bold" style={{ color: zoneColor }}>{value?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}'''

new_ll_func = '''function LiquidLevel({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const zoneColor = pct < 20 ? '#ef4444' : pct > 90 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-blue-500/20 hover:scale-[1.01] group">
      <div className="w-8 h-14 border-2 border-slate-600 rounded-lg relative overflow-hidden bg-slate-900/50">
        <div className="absolute top-0 left-0 right-0 h-[20%] border-b border-dashed border-red-500/30" />
        <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-dashed border-red-500/30" />
        <div className="absolute top-[20%] bottom-[20%] left-0 right-0 border-t border-b border-dashed border-emerald-500/20" />
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${zoneColor}60, ${zoneColor}30)` }} />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-[8px] font-bold" style={{ color: zoneColor }}>{value?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-500">{unit}</span>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}'''

content = content.replace(old_ll_func, new_ll_func)

# 7. Add Camera Settings Dialog after modeDialog
old_mode_dialog_end = '''      <Dialog open={modeDialog} onOpenChange={setModeDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Hand className="w-5 h-5 text-blue-400" /> 模式切换</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">当前: <Badge className={`text-xs ${currentMode.currentMode === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{currentMode.modeName}</Badge></p>
            <p className="text-sm text-slate-400">切换为: <Badge className={`text-xs ${modeTarget === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{modeTarget === 2 ? '自动' : '手动'}</Badge></p>
            <p className="text-xs text-yellow-500">{modeTarget === 1 ? '手动模式下联动设备不会自动启动，需人工确认后操作。' : '自动模式下联动设备将根据报警信号自动启动。'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleModeSwitch} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">{loading ? '切换中...' : '确认切换'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>'''

new_mode_dialog_end = '''      <Dialog open={modeDialog} onOpenChange={setModeDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Hand className="w-5 h-5 text-blue-400" /> 模式切换</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">当前: <Badge className={`text-xs ${currentMode.currentMode === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{currentMode.modeName}</Badge></p>
            <p className="text-sm text-slate-400">切换为: <Badge className={`text-xs ${modeTarget === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{modeTarget === 2 ? '自动' : '手动'}</Badge></p>
            <p className="text-xs text-yellow-500">{modeTarget === 1 ? '手动模式下联动设备不会自动启动，需人工确认后操作。' : '自动模式下联动设备将根据报警信号自动启动。'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleModeSwitch} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">{loading ? '切换中...' : '确认切换'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Settings Dialog */}
      <Dialog open={cameraSettingsOpen} onOpenChange={setCameraSettingsOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Cog className="w-5 h-5 text-blue-400" /> 关联摄像头设置</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {cameras.length === 0 && <p className="text-sm text-slate-500 text-center py-4">暂无摄像头数据</p>}
            {cameras.map(cam => (
              <div key={cam.id} onClick={() => setLinkedCameraId(cam.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${linkedCameraId === cam.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cam.status === 1 ? 'bg-emerald-400 led-pulse-green' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate">{cam.cameraName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{cam.cameraNo} · {cam.position || '未指定位置'}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${linkedCameraId === cam.id ? 'border-blue-400 bg-blue-400' : 'border-slate-600'}`}>
                  {linkedCameraId === cam.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraSettingsOpen(false)} className="border-slate-600 text-slate-300 h-8 text-xs">关闭</Button>
            <Button onClick={() => { setCameraSettingsOpen(false); if (linkedCameraId) { const cam = cameras.find(c => c.id === linkedCameraId); if (cam) { setVideoUrl(cam.streamUrl || ''); setVideoTitle(cam.cameraName || '视频监控'); } } }} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">确认关联</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>'''

content = content.replace(old_mode_dialog_end, new_mode_dialog_end)

with open('src/sections/FireControlRoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
