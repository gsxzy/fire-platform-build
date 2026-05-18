import { useState, useCallback } from 'react';
import { dashboardService } from '@/api/services';
import { FileText, Download, Loader2 } from 'lucide-react';

type ReportRow = {
  key: string;
  name: string;
  period: string;
  fetch: (format: 'csv' | 'xlsx') => Promise<Blob>;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthRange() {
  const end = todayStr();
  const s = new Date();
  s.setDate(s.getDate() - 30);
  const start = s.toISOString().slice(0, 10);
  return { start, end };
}

const REPORT_ITEMS: ReportRow[] = [
  {
    key: 'daily',
    name: '消防日报',
    period: '单日汇总',
    fetch: (format) => dashboardService.exportReport('daily', { date: todayStr(), format }),
  },
  {
    key: 'weekly',
    name: '消防周报',
    period: '近7天',
    fetch: (format) => dashboardService.exportReport('weekly', { endDate: todayStr(), format }),
  },
  {
    key: 'monthly',
    name: '消防月报',
    period: '当月',
    fetch: (format) => {
      const d = new Date();
      return dashboardService.exportReport('monthly', { year: d.getFullYear(), month: d.getMonth() + 1, format });
    },
  },
  {
    key: 'device',
    name: '设备运行报表',
    period: '全库',
    fetch: (format) => dashboardService.exportReport('device', { format }),
  },
  {
    key: 'maintenance',
    name: '维保执行报表',
    period: '近30天',
    fetch: (format) => {
      const { start, end } = monthRange();
      return dashboardService.exportReport('maintenance', { startDate: start, endDate: end, format });
    },
  },
  {
    key: 'patrol',
    name: '巡检报表',
    period: '近30天',
    fetch: (format) => {
      const { start, end } = monthRange();
      return dashboardService.exportReport('patrol', { startDate: start, endDate: end, format });
    },
  },
];

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const onDownload = useCallback(async (row: ReportRow, format: 'csv' | 'xlsx') => {
    setLastError(null);
    setDownloading(`${row.key}-${format}`);
    try {
      const blob = await row.fetch(format);
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const safe = `${row.name}_${todayStr()}`.replace(/\s+/g, '_');
      downloadBlob(`${safe}.${ext}`, blob);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">报表导出</h2>
            <p className="text-[10px] text-slate-500">调用后端 `/reports/*` 实时聚合，支持 CSV / Excel 导出</p>
          </div>
        </div>
      </div>

      {lastError && (
        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          上次导出失败：{lastError}
        </div>
      )}

      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 divide-y divide-slate-700/30">
        {REPORT_ITEMS.map((r) => (
          <div key={r.key} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-slate-200">{r.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {r.period} · CSV / Excel
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={downloading === `${r.key}-csv`}
                className="flex items-center gap-1 text-[10px] px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded hover:bg-slate-600/50 transition-colors disabled:opacity-50"
                onClick={() => onDownload(r, 'csv')}
              >
                {downloading === `${r.key}-csv` ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                CSV
              </button>
              <button
                type="button"
                disabled={downloading === `${r.key}-xlsx`}
                className="flex items-center gap-1 text-[10px] px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                onClick={() => onDownload(r, 'xlsx')}
              >
                {downloading === `${r.key}-xlsx` ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
