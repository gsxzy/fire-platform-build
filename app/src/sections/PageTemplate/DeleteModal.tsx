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
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-200 text-center mb-1">确认删除</h3>
        <p className="text-xs text-slate-400 text-center mb-4">
          确定要删除 <span className="text-red-400 font-medium">{name}</span> 吗？删除后不可恢复。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-600 text-slate-300" onClick={onClose} disabled={loading}>取消</Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1.5" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
