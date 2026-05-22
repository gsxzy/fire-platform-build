import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import type { Column } from './types';

interface ViewModalProps {
  row: Record<string, unknown>;
  columns: Column[];
  onClose: () => void;
}

export function ViewModal({ row, columns, onClose }: ViewModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in-smooth" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600/30 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in-smooth modal-mobile-full" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-slate-800/90 to-slate-900/90">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2.5"><Eye className="w-5 h-5 text-blue-400" />详情</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all active:scale-95" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto scrollbar-thin">
          {columns.map((col, idx) => (
            <div key={col.key} className="flex items-start gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/20 hover:border-slate-600/30 transition-colors" style={{ animationDelay: `${idx * 0.03}s` }}>
              <span className="text-xs text-slate-500 w-28 flex-shrink-0 font-medium">{col.label}</span>
              <span className="text-sm text-slate-200 flex-1 leading-relaxed">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}</span>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-700/30 flex justify-end bg-gradient-to-r from-slate-800/60 to-slate-900/60">
          <Button size="sm" className="h-9 text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
