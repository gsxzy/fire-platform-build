import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ControlRoom } from '../types';

export default function DeleteConfirmModal({
  room,
  onConfirm,
  onClose,
}: {
  room: ControlRoom | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!room) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-200 mb-1">确认删除</h3>
          <p className="text-xs text-slate-400">
            确定要删除 <span className="text-red-400 font-medium">{room.unitName}</span> 的消控室卡片吗？
          </p>
          <p className="text-[10px] text-slate-400 mt-1">删除后不可恢复，请谨慎操作。</p>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800/60 rounded-lg" onClick={onClose}>取消</Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg" onClick={onConfirm}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
