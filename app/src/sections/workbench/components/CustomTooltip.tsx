export default function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/60 rounded-lg p-2.5 shadow-2xl backdrop-blur-sm">
        <p className="text-[10px] text-slate-300 font-medium mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="text-slate-200 font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
