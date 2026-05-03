import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { FileText, Download } from 'lucide-react';

const fallbackReports = [
  { name: '报警统计月报', period: '月度', format: 'PDF', size: '2.3MB' },
  { name: '维保执行情况报表', period: '月度', format: 'Excel', size: '1.8MB' },
  { name: '消防安全综合年报', period: '年度', format: 'PDF', size: '5.6MB' },
  { name: '巡检覆盖率报表', period: '月度', format: 'PDF', size: '3.1MB' },
  { name: '隐患治理报表', period: '季度', format: 'PDF', size: '4.2MB' },
  { name: '设备运行状态分析', period: '月度', format: 'Excel', size: '2.8MB' },
];

export default function ReportExportPage() {
  const [reports, setReports] = useState(fallbackReports as any);

  useEffect(() => {
    legacyApi.dailyReport().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setReports(list);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">报表导出</h2>
            <p className="text-[10px] text-slate-500">数据报表生成与导出</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 divide-y divide-slate-700/30">
        {reports.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-slate-200">{r.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{r.period} · {r.format} · {r.size}</div>
            </div>
            <button
              className="flex items-center gap-1 text-[10px] px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
              onClick={() => {
                const blob = new Blob([`报表: ${r.name}\n周期: ${r.period}\n格式: ${r.format}\n生成时间: ${new Date().toLocaleString()}`], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${r.name}.${r.format === 'Excel' ? 'xlsx' : 'pdf'}`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-3 h-3" />下载
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
