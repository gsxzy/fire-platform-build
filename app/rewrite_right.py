path = r'D:\新致远智慧消防平台\fire-platform-build\app\src\sections\FireControlRoomPage.tsx'
with open(path, 'r', encoding='utf-8-sig') as f:
    content = f.read()

start_marker = '        {/* \u2500\u2500\u2500 Right Column: 5 info rows matching 5 buttons + Bus \u2500\u2500\u2500 */}'
end_marker = '\n      {/* ===== DIALOGS ===== */}'

start = content.find(start_marker)
end = content.find(end_marker)

print(f'start={start}, end={end}')
if start == -1 or end == -1:
    print('ERROR: markers not found')
    exit(1)

before = content[:start]
after = content[end:]

new_right = """        {/* Right Column: Info Carousel + Bus */}
        <div className=\"w-44 flex flex-col gap-1 flex-shrink-0\">
          {/* Top: Info Carousel */}
          <div className=\"flex-1 flex flex-col gap-1 min-h-0\">
            {infoIndex === 0 && (
              <div className=\"flex-1 flex flex-col gap-1\">
                <div className=\"flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-1 flex flex-col items-center justify-center gap-0.5\">
                  <div className=\"text-[9px] text-slate-500\">压力值 1</div>
                  <div className=\"text-xl font-bold text-emerald-400\">{pressure.toFixed(2)}</div>
                  <div className=\"text-[9px] text-slate-500\">MPa</div>
                  <div className=\"text-[9px] text-emerald-400\">正常</div>
                </div>
                <div className=\"flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-1 flex flex-col items-center justify-center gap-0.5\">
                  <div className=\"text-[9px] text-slate-500\">压力值 2</div>
                  <div className=\"text-xl font-bold text-emerald-400\">{(pressure * 0.95).toFixed(2)}</div>
                  <div className=\"text-[9px] text-slate-500\">MPa</div>
                  <div className=\"text-[9px] text-emerald-400\">正常</div>
                </div>
                <div className=\"flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-1 flex flex-col items-center justify-center gap-0.5\">
                  <div className=\"text-[9px] text-slate-500\">液位值 1</div>
                  <div className=\"text-xl font-bold text-blue-400\">{liquidLevel.toFixed(2)}</div>
                  <div className=\"text-[9px] text-slate-500\">m</div>
                  <div className=\"text-[9px] text-emerald-400\">正常</div>
                </div>
                <div className=\"flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-1 flex flex-col items-center justify-center gap-0.5\">
                  <div className=\"text-[9px] text-slate-500\">液位值 2</div>
                  <div className=\"text-xl font-bold text-blue-400\">{(liquidLevel * 0.85).toFixed(2)}</div>
                  <div className=\"text-[9px] text-slate-500\">m</div>
                  <div className=\"text-[9px] text-emerald-400\">正常</div>
                </div>
              </div>
            )}
            {infoIndex === 1 && (
              <div className=\"flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 flex flex-col\">
                <div className=\"px-2 py-0.5 border-b border-slate-700/50 flex items-center gap-1 flex-shrink-0\">
                  <Monitor className=\"w-3 h-3 text-slate-500\" />
                  <span className=\"text-[10px] text-slate-500\">实时监控</span>
                </div>
                <div className=\"flex-1 flex items-center justify-center text-xs text-slate-600\">视频画面</div>
              </div>
            )}
            {/* Indicators */}
            <div className=\"flex items-center justify-center gap-1 py-0.5\">
              {[0, 1].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === infoIndex ? 'bg-blue-400' : 'bg-slate-600'}`} />
              ))}
            </div>
          </div>

          {/* Bottom: Bus */}
          <div className=\"flex-shrink-0\" style={{ height: '28%' }}>
            <div className=\"h-full rounded-lg border border-slate-700/50 bg-slate-800/30 flex flex-col min-w-0\">
              <div className=\"px-2 py-1 border-b border-slate-700/50 flex items-center gap-1.5 flex-shrink-0\">
                <Activity className=\"w-3.5 h-3.5 text-blue-400\" />
                <span className=\"text-[11px] text-slate-300 font-medium\">总线盘</span>
                <Badge className=\"text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30\">{busPoints.length}点</Badge>
              </div>
              <div className=\"flex-1 overflow-y-auto scrollbar-thin p-1.5\">
                <div className=\"grid grid-cols-3 gap-1.5\">
                  {busPoints.map(p => <BusCard key={p.id} point={p} hostId={selectedHost?.id} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
"""

new_content = before + new_right + after
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done')
