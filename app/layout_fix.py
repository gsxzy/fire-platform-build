import re
path = r'D:\新致远智慧消防平台\fire-platform-build\app\src\sections\FireControlRoomPage.tsx'
with open(path, 'r', encoding='utf-8-sig') as f:
    content = f.read()

start_marker = '      {/* ===== TOP: Host + Tabs + Table + Controls + Info ===== */}'
end_marker = '\n      {/* ===== DIALOGS ===== */}'

start = content.find(start_marker)
end = content.find(end_marker)

print(f'start={start}, end={end}')
if start == -1 or end == -1:
    print('ERROR: markers not found')
    exit(1)

before = content[:start]
after = content[end:]

new_layout = """      {/* ===== MAIN: Left Column + Right Column ===== */}
      <div className="flex-1 flex gap-1 min-h-0">

        {/* ─── Left Column: Top (Host/Tabs/Table/Controls) + Bottom (Multiline) ─── */}
        <div className="flex-1 flex flex-col gap-1 min-h-0">

          {/* Top row */}
          <div className="flex gap-1 flex-1 min-h-0">

            {/* Host Model - Vertical */}
            <div className="w-12 flex flex-col items-center justify-center gap-2 flex-shrink-0 rounded-lg border border-slate-700/50 bg-slate-800/50 p-1">
              <div className="text-[9px] text-slate-500" style={{ writingMode: 'vertical-rl' }}>当前控制器</div>
              <div className="text-[10px] font-bold text-slate-300" style={{ writingMode: 'vertical-rl' }}>{selectedHost?.host_name || '未选择'}</div>
              <div className="text-[8px] text-slate-500" style={{ writingMode: 'vertical-rl' }}>{selectedHost?.duty_phone || '-'}</div>
            </div>

            {/* Type Tabs - Vertical */}
            <div className="w-16 flex flex-col gap-1 flex-shrink-0">
              {sections.map(s => {
                const Icon = s.icon;
                const isActive = activeTab === s.key;
                return (
                  <button key={s.key} onClick={() => setActiveTab(s.key as 'fire'|'fault'|'shield'|'feedback')}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all ${isActive ? `${s.bg} ${s.border} shadow-lg` : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/70'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? `text-${s.color}-400` : 'text-slate-500'}`} />
                    <span className={`text-[10px] font-medium ${isActive ? `text-${s.color}-400` : 'text-slate-400'}`}>{s.label}</span>
                    <span className={`text-[8px] ${isActive ? `text-${s.color}-400` : 'text-slate-600'}`}>({s.data.length})</span>
                  </button>
                );
              })}
            </div>

            {/* Center: Real-time Table */}
            <div className="flex-1 min-w-0 rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-h-0 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[minmax(32px,5%)_minmax(52px,8%)_minmax(120px,25%)_minmax(100px,20%)_minmax(60px,10%)_minmax(44px,8%)_minmax(40px,8%)] gap-1 px-2 h-5 bg-slate-900/60 border-b border-slate-700/40 flex-shrink-0 items-center">
                <span className="text-[10px] text-slate-500 font-medium">类型</span>
                <span className="text-[10px] text-slate-500 font-medium">时间</span>
                <span className="text-[10px] text-slate-500 font-medium">设备名称/位置</span>
                <span className="text-[10px] text-slate-500 font-medium">设备点位</span>
                <span className="text-[10px] text-slate-500 font-medium">点位编码</span>
                <span className="text-[10px] text-slate-500 font-medium">状态</span>
                <span className="text-[10px] text-slate-500 font-medium text-center">操作</span>
              </div>

              {/* Content - fixed 12 rows height */}
              <div className="overflow-y-auto scrollbar-thin" style={{ height: '264px' }}>
                {/* Fire - 4 rows */}
                <div className="flex-shrink-0">
                  {fireAlarms.slice(0, 4).map(a => (
                    <div key={a.id} className={`grid grid-cols-[minmax(32px,5%)_minmax(52px,8%)_minmax(120px,25%)_minmax(100px,20%)_minmax(60px,10%)_minmax(44px,8%)_minmax(40px,8%)] gap-1 px-2 ${rowH} border-b border-slate-700/15 items-center hover:bg-slate-700/10 transition-colors even:bg-slate-800/10`}>
                      <Badge className={`text-[9px] w-fit scale-90 origin-left ${typeColors[a.alarm_type]}`}>{typeLabels[a.alarm_type]}</Badge>
                      <span className={`${cell} text-slate-400`}>{(a.created_at || '').slice(5)}</span>
                      <span className={`${cell} text-slate-200 font-medium`}>{a.device_name}</span>
                      <span className={`${cell} text-slate-400`}>{a.device_point}</span>
                      <span className={`${cell} text-slate-400 font-mono`}>{a.device_code}</span>
                      <span className={`text-[10px] leading-none ${statusColors[a.status]}`}>{statusLabels[a.status]}</span>
                      <div className="flex items-center justify-center">
                        {a.status === 0 ? (
                          <button onClick={() => handleConfirm(String(a.id), 1)} disabled={confirmingId === String(a.id)} className="text-[9px] px-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors leading-none py-0.5">{confirmingId === String(a.id) ? '中' : '确认'}</button>
                        ) : (
                          <button className="text-[9px] px-1.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600 transition-colors leading-none py-0.5 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />查看</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {fireAlarms.length === 0 && <div className={`${rowH} flex items-center px-2 text-[10px] text-slate-600`}>暂无火警</div>}
                </div>

                {/* Fault - 4 rows */}
                <div className="flex-shrink-0 border-t border-slate-700/30">
                  {faultAlarms.slice(0, 4).map(f => (
                    <div key={f.id} className={`grid grid-cols-[minmax(32px,5%)_minmax(52px,8%)_minmax(120px,25%)_minmax(100px,20%)_minmax(60px,10%)_minmax(44px,8%)_minmax(40px,8%)] gap-1 px-2 ${rowH} border-b border-slate-700/15 items-center hover:bg-slate-700/10 transition-colors even:bg-slate-800/10`}>
                      <Badge className="text-[9px] w-fit scale-90 origin-left text-yellow-400 bg-yellow-500/15 border-yellow-500/30">故障</Badge>
                      <span className={`${cell} text-slate-400`}>{(f.created_at || '').slice(5)}</span>
                      <span className={`${cell} text-slate-200 font-medium`}>{f.device_name}</span>
                      <span className={`${cell} text-slate-400`}>{f.device_type}</span>
                      <span className={`${cell} text-slate-400 font-mono`}>{f.alarm_no}</span>
                      <span className={`text-[10px] leading-none ${f.status === 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>{f.status === 0 ? '未处理' : '已处理'}</span>
                      <div className="flex items-center justify-center"><button className="text-[9px] px-1.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600 transition-colors leading-none py-0.5 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />查看</button></div>
                    </div>
                  ))}
                  {faultAlarms.length === 0 && <div className={`${rowH} flex items-center px-2 text-[10px] text-slate-600`}>暂无故障</div>}
                </div>

                {/* Shield - 4 rows */}
                <div className="flex-shrink-0 border-t border-slate-700/30">
                  {shieldItems.slice(0, 4).map(s => (
                    <div key={s.id} className={`grid grid-cols-[minmax(32px,5%)_minmax(52px,8%)_minmax(120px,25%)_minmax(100px,20%)_minmax(60px,10%)_minmax(44px,8%)_minmax(40px,8%)] gap-1 px-2 ${rowH} border-b border-slate-700/15 items-center hover:bg-slate-700/10 transition-colors even:bg-slate-800/10`}>
                      <Badge className="text-[9px] w-fit scale-90 origin-left text-purple-400 bg-purple-500/15 border-purple-500/30">屏蔽</Badge>
                      <span className={`${cell} text-slate-400`}>{(s.shield_time || '').slice(5)}</span>
                      <span className={`${cell} text-slate-200 font-medium`}>{s.point_name}</span>
                      <span className={`${cell} text-slate-400`}>{s.device_type}</span>
                      <span className={`${cell} text-slate-400 truncate`}>{s.shield_reason}</span>
                      <span className="text-[10px] leading-none text-purple-400">屏蔽中</span>
                      <div className="flex items-center justify-center"><button className="text-[9px] px-1.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors leading-none py-0.5">解除</button></div>
                    </div>
                  ))}
                  {shieldItems.length === 0 && <div className={`${rowH} flex items-center px-2 text-[10px] text-slate-600`}>暂无屏蔽</div>}
                </div>

                {/* Feedback - 4 rows */}
                <div className="flex-shrink-0 border-t border-slate-700/30">
                  {feedbackAlarms.slice(0, 4).map(fb => (
                    <div key={fb.id} className={`grid grid-cols-[minmax(32px,5%)_minmax(52px,8%)_minmax(120px,25%)_minmax(100px,20%)_minmax(60px,10%)_minmax(44px,8%)_minmax(40px,8%)] gap-1 px-2 ${rowH} border-b border-slate-700/15 items-center hover:bg-slate-700/10 transition-colors even:bg-slate-800/10`}>
                      <Badge className="text-[9px] w-fit scale-90 origin-left text-blue-400 bg-blue-500/15 border-blue-500/30">反馈</Badge>
                      <span className={`${cell} text-slate-400`}>{(fb.created_at || '').slice(5)}</span>
                      <span className={`${cell} text-slate-200 font-medium`}>{fb.device_name}</span>
                      <span className={`${cell} text-slate-400`}>{fb.feedback_desc}</span>
                      <span className={`${cell} text-slate-400`}>—</span>
                      <span className="text-[10px] leading-none text-blue-400">正常</span>
                      <div className="flex items-center justify-center"><button className="text-[9px] px-1.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600 transition-colors leading-none py-0.5 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />查看</button></div>
                    </div>
                  ))}
                  {feedbackAlarms.length === 0 && <div className={`${rowH} flex items-center px-2 text-[10px] text-slate-600`}>暂无反馈</div>}
                </div>
              </div>
            </div>

            {/* Control Buttons - Vertical */}
            <div className="w-32 flex flex-col gap-1 flex-shrink-0">
              <Button onClick={() => setSilenceDialog(true)} className={`h-full flex-1 flex items-center justify-center gap-1.5 border-0 transition-all shadow-lg px-2 ${silencePressed ? 'bg-emerald-500/40 text-emerald-200 shadow-emerald-500/25' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35 shadow-emerald-500/15'}`}>
                <VolumeX className="w-5 h-5" /><span className="text-[13px] font-bold">{silencePressed ? '已消音' : '消音'}</span>
              </Button>
              <Button onClick={() => setResetDialog(true)} className="h-full flex-1 flex items-center justify-center gap-1.5 border-0 bg-orange-500/20 text-orange-300 hover:bg-orange-500/35 shadow-lg shadow-orange-500/15 px-2">
                <RotateCcw className="w-5 h-5" /><span className="text-[13px] font-bold">复位</span>
              </Button>
              <Button onClick={() => setShieldDialog(true)} className="h-full flex-1 flex items-center justify-center gap-1.5 border-0 bg-purple-500/20 text-purple-300 hover:bg-purple-500/35 shadow-lg shadow-purple-500/15 px-2">
                <Shield className="w-5 h-5" /><span className="text-[13px] font-bold">屏蔽</span>
              </Button>
              <Button onClick={() => openModeDialog(2)} className={`h-full flex-1 flex items-center justify-center gap-1.5 border-0 shadow-lg px-2 ${currentMode.currentMode === 2 ? 'bg-emerald-500/30 text-emerald-200 shadow-emerald-500/25 ring-1 ring-emerald-500/40' : 'bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20 shadow-emerald-500/10'}`}>
                <CheckCircle className="w-5 h-5" /><span className="text-[13px] font-bold">自动</span>
              </Button>
              <Button onClick={() => openModeDialog(1)} className={`h-full flex-1 flex items-center justify-center gap-1.5 border-0 shadow-lg px-2 ${currentMode.currentMode === 1 ? 'bg-amber-500/30 text-amber-200 shadow-amber-500/25 ring-1 ring-amber-500/40' : 'bg-amber-500/10 text-amber-400/70 hover:bg-amber-500/20 shadow-amber-500/10'}`}>
                <Hand className="w-5 h-5" /><span className="text-[13px] font-bold">手动</span>
              </Button>
            </div>
          </div>

          {/* Bottom: Multiline */}
          <div className="flex-shrink-0" style={{ height: '28%' }}>
            <div className="h-full rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-w-0">
              <div className="px-2 py-1 border-b border-slate-700/50 flex items-center gap-1.5 flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-300 font-medium">多线盘控制</span>
                <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/25">{multilinePoints.length}路</Badge>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {multilinePoints.map(p => <MultilineCard key={p.id} point={p} hostId={selectedHost?.id} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Top (Info) + Bottom (Bus) ─── */}
        <div className="w-44 flex flex-col gap-1.5 flex-shrink-0">
          {/* Top: Info Panel */}
          <div className="flex-1 flex flex-col gap-1.5 min-h-0">
            {infoIndex === 0 && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-[10px] text-slate-500 mb-0.5">压力值</div>
                  <div className="text-2xl font-bold text-emerald-400">{pressure.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">MPa</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">正常</div>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center flex-1 flex flex-col justify-center">
                  <div className="text-[10px] text-slate-500 mb-0.5">液位值</div>
                  <div className="text-2xl font-bold text-blue-400">{liquidLevel.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500">m</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">正常</div>
                </div>
              </div>
            )}
            {infoIndex === 1 && (
              <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 flex flex-col">
                <div className="px-2 py-0.5 border-b border-slate-700/50 flex items-center gap-1 flex-shrink-0">
                  <Monitor className="w-3 h-3 text-slate-500" /><span className="text-[10px] text-slate-500">实时监控</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-xs text-slate-600">视频画面</div>
              </div>
            )}
            {infoIndex === 2 && (
              <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">总线盘:<span className="text-blue-400 font-bold ml-1">{busPoints.length}</span></span>
                  <span className="text-slate-400">多线盘:<span className="text-amber-400 font-bold ml-1">{multilinePoints.length}</span></span>
                </div>
                <div className="text-[10px] text-slate-500">系统运行正常</div>
                <div className="text-[10px] text-slate-500">上次巡检: 2026-04-23</div>
              </div>
            )}
            {/* Indicators */}
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === infoIndex ? 'bg-blue-400' : 'bg-slate-600'}`} />
              ))}
            </div>
          </div>

          {/* Bottom: Bus */}
          <div className="flex-shrink-0" style={{ height: '28%' }}>
            <div className="h-full rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-w-0">
              <div className="px-2 py-1 border-b border-slate-700/50 flex items-center gap-1.5 flex-shrink-0">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-300 font-medium">总线盘</span>
                <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30">{busPoints.length}点</Badge>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {busPoints.map(p => <BusCard key={p.id} point={p} hostId={selectedHost?.id} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
"""

new_content = before + new_layout + after
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done')
