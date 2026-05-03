import re
path = r"D:\新致远智慧消防平台\fire-platform-build\app\src\sections\FireControlRoomPage.tsx"
with open(path, "r", encoding="utf-8-sig") as f:
    content = f.read()

start = content.find("  return (\n    <DataContainer loading={pageLoading}")
end = content.find("    </DataContainer>\n  );\n}\n\n/* ")

# Build new layout
new_layout = '''  return (
    <DataContainer loading={pageLoading} error={error} data={selectedHost} onRetry={loadData} emptyText="暂无消控室数据">
    <div className="h-full flex flex-col gap-1 p-1 bg-slate-900">
      {/* Room Header */}
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/30 flex-shrink-0">
        <button onClick={() => navigate("/monitor/control")} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
          <span>← 返回数智消控室</span>
        </button>
        <div className="w-px h-3 bg-slate-600" />
        <Monitor className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[12px] font-bold text-slate-100">{roomName}</span>
        <span className="text-[10px] text-slate-400">— 消防报警主机集中控制</span>
      </div>

      {/* ===== TOP: Left Panel + Center Table + Right Panel ===== */}
      <div className="flex gap-1 flex-1 min-h-0">

        {/* ─── Left Panel: Host Info + Controls + Tabs ─── */}
        <div className="w-36 flex flex-col gap-1 flex-shrink-0">
          {/* Host Info */}
          <div className="p-2 rounded-lg border border-slate-700/50 bg-slate-800/50 flex-shrink-0">
            <div className="text-[10px] text-slate-500 mb-1">当前控制器</div>
            <div className="text-[11px] font-bold text-slate-100 mb-1 leading-tight">{selectedHost?.host_name || "未选择控制器"}</div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500">
              <Phone className="w-2.5 h-2.5" />{selectedHost?.duty_phone || "-"}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
              <User className="w-2.5 h-2.5" />{selectedHost?.duty_person || "-"}
            </div>
          </div>

          {/* Control Buttons - Vertical */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button onClick={() => setSilenceDialog(true)} className={`h-9 flex items-center justify-center gap-1.5 border-0 transition-all shadow-lg px-2 ${silencePressed ? "bg-emerald-500/40 text-emerald-200 shadow-emerald-500/25" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35 shadow-emerald-500/15"}`}>
              <VolumeX className="w-4 h-4" /><span className="text-[12px] font-bold">{silencePressed ? "已消音" : "消音"}</span>
            </Button>
            <Button onClick={() => setResetDialog(true)} className="h-9 flex items-center justify-center gap-1.5 border-0 bg-orange-500/20 text-orange-300 hover:bg-orange-500/35 shadow-lg shadow-orange-500/15 px-2">
              <RotateCcw className="w-4 h-4" /><span className="text-[12px] font-bold">复位</span>
            </Button>
            <Button onClick={() => setShieldDialog(true)} className="h-9 flex items-center justify-center gap-1.5 border-0 bg-purple-500/20 text-purple-300 hover:bg-purple-500/35 shadow-lg shadow-purple-500/15 px-2">
              <Shield className="w-4 h-4" /><span className="text-[12px] font-bold">屏蔽</span>
            </Button>
            <Button onClick={() => openModeDialog(2)} className={`h-9 flex items-center justify-center gap-1.5 border-0 shadow-lg px-2 ${currentMode.currentMode === 2 ? "bg-emerald-500/30 text-emerald-200 shadow-emerald-500/25 ring-1 ring-emerald-500/40" : "bg-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/20 shadow-emerald-500/10"}`}>
              <CheckCircle className="w-4 h-4" /><span className="text-[12px] font-bold">自动</span>
            </Button>
            <Button onClick={() => openModeDialog(1)} className={`h-9 flex items-center justify-center gap-1.5 border-0 shadow-lg px-2 ${currentMode.currentMode === 1 ? "bg-amber-500/30 text-amber-200 shadow-amber-500/25 ring-1 ring-amber-500/40" : "bg-amber-500/10 text-amber-400/70 hover:bg-amber-500/20 shadow-amber-500/10"}`}>
              <Hand className="w-4 h-4" /><span className="text-[12px] font-bold">手动</span>
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex flex-col gap-1 min-h-0">
            {sections.map(s => {
              const Icon = s.icon;
              const isActive = activeTab === s.key;
              return (
                <button key={s.key} onClick={() => setActiveTab(s.key as "fire"|"fault"|"shield"|"feedback")}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all ${isActive ? `${s.bg} ${s.border} shadow-lg` : "border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/70"}`}>
                  <Icon className={`w-4 h-4 ${isActive ? `text-${s.color}-400` : "text-slate-500"}`} />
                  <span className={`text-[10px] font-medium ${isActive ? `text-${s.color}-400` : "text-slate-400"}`}>{s.label}</span>
                  <span className={`text-[8px] ${isActive ? `text-${s.color}-400` : "text-slate-600"}`}>({s.data.length})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Center: All 4 Types Display ─── */}
        <div className="flex-1 min-w-0 rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-h-0 overflow-hidden">'''

# Append the rest of center content (header + 4 sections)
center_rest = content[content.find("{/* Header */}"):content.find("        {/* ─── Right: Control Panel ─── */}")]
new_layout += "\n" + center_rest

# Right panel
new_layout += '''        {/* ─── Right: Info Panel ─── */}
        <div className="w-48 flex flex-col gap-1.5 flex-shrink-0">
          {/* Pressure + Level */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
              <div className="text-[10px] text-slate-500 mb-0.5">压力值</div>
              <div className="text-xl font-bold text-emerald-400">{pressure.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500">MPa</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">正常</div>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-center">
              <div className="text-[10px] text-slate-500 mb-0.5">液位值</div>
              <div className="text-xl font-bold text-blue-400">{liquidLevel.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500">m</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">正常</div>
            </div>
          </div>

          {/* Point Stats */}
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">总线盘:<span className="text-blue-400 font-bold ml-1">{busPoints.length}</span></span>
              <span className="text-slate-400">多线盘:<span className="text-amber-400 font-bold ml-1">{multilinePoints.length}</span></span>
            </div>
          </div>

          {/* Video */}
          <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 flex flex-col min-h-[40px]">
            <div className="px-2 py-0.5 border-b border-slate-700/50 flex items-center gap-1 flex-shrink-0">
              <Monitor className="w-3 h-3 text-slate-500" /><span className="text-[10px] text-slate-500">实时监控</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-xs text-slate-600">视频画面</div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: Multiline + Bus ===== */}
      <div className="flex gap-1 flex-shrink-0" style={{ height: "28%" }}>
        {/* Spacer to align with left panel */}
        <div className="w-36 flex-shrink-0" />
        {/* Multiline */}
        <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-w-0">
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

        {/* Bus */}
        <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-w-0">
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

      {/* ===== DIALOGS ===== */}
'''

# Append dialogs from original
dialogs_start = content.find("      {/* ===== DIALOGS ===== */}")
if dialogs_start == -1:
    dialogs_start = content.find("      <Dialog open={silenceDialog}")
new_layout += content[dialogs_start:end]
new_layout += "    </DataContainer>\n  );\n}\n\n/* "

new_content = content[:start] + new_layout + content[end+len("    </DataContainer>\n  );\n}\n\n/* "):]
with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Done")
