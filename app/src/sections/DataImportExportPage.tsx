import { useState, useEffect, useRef } from 'react';
import { legacyApi } from '@/api/services';
import {
  Upload, Download, FileSpreadsheet, FileText, Database,
  CheckCircle, AlertTriangle, ChevronRight, Trash2, RefreshCw,
  ArrowRight, Clock, HardDrive, Filter, Wrench, Building2
} from 'lucide-react';

interface ImportTask {
  id: number;
  name: string;
  type: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  total: number;
  success: number;
  fail: number;
  time: string;
}

interface ExportTask {
  id: number;
  name: string;
  format: string;
  size: string;
  status: 'ready' | 'generating' | 'done';
  createdAt: string;
}

const fallbackImportHistory: ImportTask[] = [
  { id: 1, name: '设备档案批量导入', type: 'Excel', status: 'success', progress: 100, total: 2450, success: 2438, fail: 12, time: '2026-04-18 14:32' },
  { id: 2, name: '单位信息更新导入', type: 'Excel', status: 'success', progress: 100, total: 186, success: 186, fail: 0, time: '2026-04-18 10:15' },
  { id: 3, name: '维保记录导入', type: 'CSV', status: 'error', progress: 45, total: 520, success: 234, fail: 286, time: '2026-04-17 16:48' },
  { id: 4, name: '巡检点位导入', type: 'Excel', status: 'processing', progress: 72, total: 1200, success: 864, fail: 0, time: '2026-04-19 09:20' },
];

const fallbackExportList: ExportTask[] = [
  { id: 1, name: '设备完整档案导出', format: 'Excel', size: '12.5 MB', status: 'done', createdAt: '2026-04-19 08:00' },
  { id: 2, name: '告警记录月度报表', format: 'PDF', size: '3.2 MB', status: 'done', createdAt: '2026-04-18 18:30' },
  { id: 3, name: '单位消防设施台账', format: 'Excel', size: '8.7 MB', status: 'generating', createdAt: '2026-04-19 09:15' },
  { id: 4, name: '维保工单记录导出', format: 'CSV', size: '2.1 MB', status: 'done', createdAt: '2026-04-17 12:00' },
];

const fallbackImportTemplates = [
  { name: '设备档案模板', desc: '消防设备基础信息、安装位置、参数配置', format: 'XLSX', size: '24 KB' },
  { name: '单位信息模板', desc: '社会单位基本信息、联系人、消防等级', format: 'XLSX', size: '18 KB' },
  { name: '维保记录模板', desc: '维保工单、执行记录、更换配件', format: 'XLSX', size: '32 KB' },
  { name: '巡检点位模板', desc: '巡检路线、检查项、标准值', format: 'XLSX', size: '28 KB' },
  { name: '人员信息模板', desc: '消防管理人员、值班人员、资质信息', format: 'XLSX', size: '20 KB' },
];

export default function DataImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [dragOver, setDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importHistory, setImportHistory] = useState(fallbackImportHistory as any);
  const [exportList] = useState(fallbackExportList as any);
  const [importTemplates] = useState(fallbackImportTemplates as any);

  useEffect(() => {
    legacyApi.logList().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setImportHistory(list);
    }).catch(() => {});
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadFiles(prev => [...prev, ...files.map(f => f.name)]);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success': case 'done': return <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400">完成</span>;
      case 'processing': case 'generating': return <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400">进行中</span>;
      case 'error': return <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400">失败</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-500/10 text-slate-400">等待</span>;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': case 'done': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'processing': case 'generating': return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>系统管理</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">数据导入导出</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '本月导入', value: '4,356', unit: '条', icon: Upload, color: 'blue' },
          { label: '本月导出', value: '28', unit: '次', icon: Download, color: 'emerald' },
          { label: '导入成功率', value: '98.6', unit: '%', icon: CheckCircle, color: 'green' },
          { label: '存储占用', value: '156.3', unit: 'MB', icon: HardDrive, color: 'purple' },
        ].map((s: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{s.label}</span>
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-slate-100">{s.value}<span className="text-xs font-normal text-slate-500 ml-1">{s.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-slate-700/30">
        <button onClick={() => setActiveTab('import')} className={`px-4 py-2 text-xs rounded-md transition-all ${activeTab === 'import' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Upload className="w-3.5 h-3.5 inline mr-1.5" />数据导入
        </button>
        <button onClick={() => setActiveTab('export')} className={`px-4 py-2 text-xs rounded-md transition-all ${activeTab === 'export' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Download className="w-3.5 h-3.5 inline mr-1.5" />数据导出
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Upload Area */}
          <div className="col-span-2 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-blue-400 bg-blue-500/5' : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setUploadFiles(prev => [...prev, ...files.map(f => f.name)]);
              }} />
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 mb-1">拖拽文件到此处，或点击上传</p>
              <p className="text-[10px] text-slate-500">支持 Excel (.xlsx, .xls) 和 CSV 格式，单个文件不超过 50MB</p>
            </div>

            {uploadFiles.length > 0 && (
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">待上传文件 ({uploadFiles.length})</span>
                  <button onClick={() => setUploadFiles([])} className="text-[10px] text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3 inline mr-1" />清空</button>
                </div>
                {uploadFiles.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/20 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-slate-300">{f}</span>
                    </div>
                    <button onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400" aria-label="删除"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                <button
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
                  onClick={() => {
                    if (uploadFiles.length === 0) { alert('请先选择文件'); return; }
                    alert(`正在导入 ${uploadFiles.length} 个文件...\n（演示：实际导入逻辑待后端对接）`);
                    setUploadFiles([]);
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />开始导入
                </button>
              </div>
            )}

            {/* Import History */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
                <h3 className="text-xs font-medium text-slate-200">导入记录</h3>
                <button
                  className="text-[10px] text-blue-400 hover:text-blue-300"
                  onClick={() => alert('刷新导入记录（演示）')}
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />刷新
                </button>
              </div>
              <div className="divide-y divide-slate-700/30">
                {importHistory.map((t: any) => (
                  <div key={t.id} className="p-3 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon(t.status)}
                        <span className="text-xs text-slate-200 font-medium">{t.name}</span>
                        <span className="text-[10px] text-slate-500">{t.type}</span>
                      </div>
                      {statusBadge(t.status)}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 ml-6">
                      <span>共 {t.total.toLocaleString()} 条</span>
                      <span className="text-emerald-400">成功 {t.success.toLocaleString()}</span>
                      {t.fail > 0 && <span className="text-red-400">失败 {t.fail}</span>}
                      <span>{t.time}</span>
                    </div>
                    {t.status === 'processing' && (
                      <div className="ml-6 mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${t.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="p-3 border-b border-slate-700/30">
              <h3 className="text-xs font-medium text-slate-200">导入模板下载</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">下载标准模板，按格式填写后导入</p>
            </div>
            <div className="divide-y divide-slate-700/30">
              {importTemplates.map((t: any, i: number) => (
                <div key={i} className="p-3 hover:bg-slate-700/20 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-200">{t.name}</span>
                    </div>
                    <button className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-300">
                      <Download className="w-3 h-3 inline mr-0.5" />下载
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">{t.desc}</p>
                  <div className="flex items-center gap-2 ml-6 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/30 rounded text-slate-400">{t.format}</span>
                    <span className="text-[9px] text-slate-500">{t.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Export */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '设备档案', icon: Database, desc: '全部设备完整信息' },
              { label: '告警记录', icon: FileText, desc: '指定时间段告警' },
              { label: '维保数据', icon: Wrench, desc: '维保工单与记录' },
              { label: '单位台账', icon: Building2, desc: '单位消防设施' },
            ].map((item: any, i: number) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30 hover:border-blue-500/30 transition-all group cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs text-slate-200 font-medium">{item.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">{item.desc}</p>
                <button className="w-full py-1.5 bg-slate-700/30 hover:bg-blue-500/20 text-blue-400 text-[10px] rounded transition-all flex items-center justify-center gap-1">
                  导出 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>

          {/* Export Records */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-xs font-medium text-slate-200">导出记录</h3>
              <div className="flex items-center gap-2">
                <button className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 bg-slate-700/30 rounded">
                  <Filter className="w-3 h-3" />筛选
                </button>
                <button className="text-[10px] text-blue-400 hover:text-blue-300"><RefreshCw className="w-3 h-3 inline mr-1" />刷新</button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
                  <th className="text-left p-3 font-medium">任务名称</th>
                  <th className="text-left p-3 font-medium">格式</th>
                  <th className="text-left p-3 font-medium">大小</th>
                  <th className="text-left p-3 font-medium">状态</th>
                  <th className="text-left p-3 font-medium">创建时间</th>
                  <th className="text-left p-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {exportList.map((e: any) => (
                  <tr key={e.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {e.format === 'PDF' ? <FileText className="w-4 h-4 text-red-400" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                        <span className="text-slate-200">{e.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><span className="px-1.5 py-0.5 bg-slate-700/30 rounded text-[10px] text-slate-400">{e.format}</span></td>
                    <td className="p-3 text-slate-400">{e.size}</td>
                    <td className="p-3">{statusBadge(e.status)}</td>
                    <td className="p-3 text-slate-500">{e.createdAt}</td>
                    <td className="p-3">
                      {e.status === 'done' ? (
                        <button className="text-[10px] text-blue-400 hover:text-blue-300"><Download className="w-3 h-3 inline mr-1" />下载</button>
                      ) : (
                        <span className="text-[10px] text-slate-500">等待生成...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
