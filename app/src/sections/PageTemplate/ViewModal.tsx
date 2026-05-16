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
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" />详情</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {columns.map(col => (
            <div key={col.key} className="flex items-start gap-3">
              <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{col.label}</span>
              <span className="text-xs text-slate-200 flex-1">{col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-600/30 flex justify-end">
          <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}
