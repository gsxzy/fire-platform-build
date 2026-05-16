/**
 * 表格 tbody 内统一加载 / 空数据占位（与 DataContainer 文案风格一致）
 */
import { Loader2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

interface TableBodyPlaceholderProps {
  colSpan: number;
  loading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyType?: 'data' | 'search';
}

export default function TableBodyPlaceholder({
  colSpan,
  loading,
  isEmpty,
  emptyTitle = '暂无数据',
  emptyDescription,
  emptyType = 'data',
}: TableBodyPlaceholderProps) {
  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0 align-top">
          <div className="flex flex-col items-center justify-center gap-3 py-14 min-h-[200px]">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <p className="text-xs text-slate-500">数据加载中，请稍候…</p>
          </div>
        </td>
      </tr>
    );
  }
  if (isEmpty) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0 align-top">
          <EmptyState
            type={emptyType}
            title={emptyTitle}
            description={emptyDescription}
            className="py-10"
          />
        </td>
      </tr>
    );
  }
  return null;
}
