import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImportResultModalProps {
  result: { total: number; success: number; failed: number; unmatched: string[] } | null;
  onClose: () => void;
}

export default function ImportResultModal({ result, onClose }: ImportResultModalProps) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-96 max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-200">导入结果</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-700/30 rounded p-2 text-center">
            <div className="text-sm font-bold text-slate-200">{result.total}</div>
            <div className="text-[9px] text-slate-500">总计</div>
          </div>
          <div className="bg-emerald-500/10 rounded p-2 text-center">
            <div className="text-sm font-bold text-emerald-400">{result.success}</div>
            <div className="text-[9px] text-emerald-500/70">成功</div>
          </div>
          <div className="bg-red-500/10 rounded p-2 text-center">
            <div className="text-sm font-bold text-red-400">{result.failed}</div>
            <div className="text-[9px] text-red-500/70">失败</div>
          </div>
        </div>
        {result.unmatched.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-slate-500 mb-1">未匹配编码：</div>
            <div className="max-h-24 overflow-y-auto scrollbar-thin bg-slate-900/50 rounded p-2 text-[10px] text-red-400 leading-relaxed">
              {result.unmatched.join(', ')}
            </div>
          </div>
        )}
        <Button size="sm" className="w-full h-8 text-[10px] bg-blue-600 hover:bg-blue-700" onClick={onClose}>确定</Button>
      </div>
    </div>
  );
}
