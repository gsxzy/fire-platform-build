import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function DeleteModal({ name, onConfirm, onClose, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in-smooth" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600/30 rounded-2xl shadow-2xl shadow-black/40 p-6 animate-scale-in-smooth" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-100 text-center mb-2">确认删除</h3>
        <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
          确定要删除 <span className="text-red-400 font-semibold">{name}</span> 吗？<br/>删除后不可恢复。
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="flex-1 h-9 text-sm border-slate-600/50 text-slate-300 hover:bg-slate-700/40 hover:text-slate-200 rounded-xl transition-all active:scale-95" onClick={onClose} disabled={loading}>取消</Button>
          <Button size="sm" className="flex-1 h-9 text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-95" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
