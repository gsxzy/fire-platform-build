import { useState, useEffect } from "react";
import { useToast } from "@/core/ToastContext";
import { legacyRaw } from "@/api/client";
import { getErrorMessage } from "@/types/api";
import DataContainer from "@/components/DataContainer";
import {
  ClipboardList, Eye, X, Shield, Monitor, Bell, CheckCircle, AlertTriangle,
  ChevronRight, Calendar
} from "lucide-react";

/* ===== Types ===== */
interface HandoverItem {
  id: string;
  handoverTime: string;
  shiftName: string;
  outgoingName: string;
  incomingName: string;
  equipmentStatus: string;
  monitorStatus: string;
  pendingAlarms: number;
  notes: string;
  status: "normal" | "abnormal";
}

function formatDutyDt(d: unknown): string {
  if (d == null || d === "") return "";
  try {
    const t = typeof d === "string" ? d : new Date(d as string | number | Date).toISOString();
    return t.replace("T", " ").slice(0, 19);
  } catch {
    return String(d);
  }
}

/** 将值班日志（签退）映射为交接班列表项 */
function mapDutyLogToHandover(log: Record<string, unknown>): HandoverItem | null {
  const off = log.off_duty_time ?? log.offDutyTime;
  if (!off) return null;
  const handoverTime = formatDutyDt(off);
  const content = String(log.handover_content ?? log.handoverContent ?? "").trim();
  const incidents = String(log.incidents ?? "").trim();
  const notes = [content, incidents].filter(Boolean).join("；") || "无";
  let pendingAlarms = 0;
  const m = incidents.match(/(\d+)\s*条/);
  if (m) pendingAlarms = parseInt(m[1], 10);
  const abnormal =
    /异常|故障|未处理|alarm/i.test(content + incidents) || pendingAlarms > 0;
  return {
    id: String(log.id ?? ""),
    handoverTime,
    shiftName: "值班签退",
    outgoingName: String(log.user_name ?? log.userName ?? "—"),
    incomingName: "—",
    equipmentStatus: abnormal ? "异常" : "正常",
    monitorStatus: abnormal ? "异常" : "正常",
    pendingAlarms,
    notes,
    status: abnormal ? "abnormal" : "normal",
  };
}

/* ===== Detail Modal ===== */
function DetailModal({ item, onClose }: { item: HandoverItem | null; onClose: () => void }) {
  if (!item) return null;

  const equipClass = item.equipmentStatus === "正常"
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-red-500/10 text-red-400";

  const monitorClass = item.monitorStatus === "正常"
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-red-500/10 text-red-400";

  const alarmClass = item.pendingAlarms > 0
    ? "bg-yellow-500/10 text-yellow-400"
    : "bg-emerald-500/10 text-emerald-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            交接班详情
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2 rounded bg-slate-700/20">
              <span className="text-slate-500 block text-[9px] mb-0.5">交接时间</span>
              <span className="text-slate-200 font-mono">{item.handoverTime}</span>
            </div>
            <div className="p-2 rounded bg-slate-700/20">
              <span className="text-slate-500 block text-[9px] mb-0.5">班次</span>
              <span className="text-slate-200">{item.shiftName}</span>
            </div>
            <div className="p-2 rounded bg-slate-700/20">
              <span className="text-slate-500 block text-[9px] mb-0.5">交班人</span>
              <span className="text-slate-200">{item.outgoingName}</span>
            </div>
            <div className="p-2 rounded bg-slate-700/20">
              <span className="text-slate-500 block text-[9px] mb-0.5">接班人</span>
              <span className="text-slate-200">{item.incomingName}</span>
            </div>
          </div>

          <div className="border-t border-slate-700/30 pt-3">
            <h4 className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />交接检查清单
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-slate-700/20">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-300">消防主机状态</span>
                </div>
                <span className={"text-[10px] px-2 py-0.5 rounded flex items-center gap-1 " + equipClass}>
                  {item.equipmentStatus === "正常" ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {item.equipmentStatus}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-700/20">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-300">监控系统状态</span>
                </div>
                <span className={"text-[10px] px-2 py-0.5 rounded flex items-center gap-1 " + monitorClass}>
                  {item.monitorStatus === "正常" ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {item.monitorStatus}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-700/20">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-300">未处理报警数</span>
                </div>
                <span className={"text-[10px] px-2 py-0.5 rounded " + alarmClass}>
                  {item.pendingAlarms}条
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700/30 pt-3">
            <h4 className="text-[10px] text-slate-400 mb-1">交接备注</h4>
            <div className="p-2 rounded bg-slate-700/20 text-[11px] text-slate-300">
              {item.notes || "无备注"}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors">关闭</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Main Page ===== */
export default function HandoverPage() {
  const { success: _showSuccess } = useToast();
  const [list, setList] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedItem, setSelectedItem] = useState<HandoverItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageData = await legacyRaw.get<{ list: Record<string, unknown>[]; total?: number }>("/duty/logs", {
        pageNum: 1,
        pageSize: 200,
      });
      const rows = Array.isArray(pageData?.list) ? pageData.list : [];
      const mapped = rows
        .map((row) => mapDutyLogToHandover(row))
        .filter((x): x is HandoverItem => x != null);
      setList(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(getErrorMessage(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const filtered = list.filter(item => {
    if (!item.handoverTime) return false;
    return item.handoverTime >= startDate && item.handoverTime <= (endDate + " 23:59");
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <ClipboardList className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">交接班记录</h2>
            <p className="text-[10px] text-slate-500">班次交接与历史记录</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">{filtered.length}条</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg border border-slate-700/30 px-2 py-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] text-slate-200 outline-none" />
            <ChevronRight className="w-3 h-3 text-slate-500" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] text-slate-200 outline-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-hidden flex flex-col min-h-0">
        <DataContainer loading={loading} error={error} data={filtered} onRetry={fetchData}>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800/90 backdrop-blur z-10">
                <tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
                  <th className="text-left p-2.5 font-medium">交接时间</th>
                  <th className="text-left p-2.5 font-medium">班次</th>
                  <th className="text-left p-2.5 font-medium">交班人</th>
                  <th className="text-left p-2.5 font-medium">接班人</th>
                  <th className="text-left p-2.5 font-medium">设备状态</th>
                  <th className="text-left p-2.5 font-medium">未处理报警</th>
                  <th className="text-left p-2.5 font-medium">备注</th>
                  <th className="text-left p-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {filtered.map(item => {
                  const equipClass = item.equipmentStatus === "正常"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400";
                  const alarmClass = item.pendingAlarms > 0
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-emerald-500/10 text-emerald-400";
                  return (
                    <tr key={item.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                      <td className="p-2.5 text-slate-400 font-mono">{item.handoverTime}</td>
                      <td className="p-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{item.shiftName}</span>
                      </td>
                      <td className="p-2.5 text-slate-200">{item.outgoingName}</td>
                      <td className="p-2.5 text-slate-200">{item.incomingName}</td>
                      <td className="p-2.5">
                        <span className={"text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 w-fit " + equipClass}>
                          {item.equipmentStatus === "正常" ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {item.equipmentStatus}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={"text-[9px] px-1.5 py-0.5 rounded " + alarmClass}>
                          {item.pendingAlarms}条
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 truncate max-w-[120px]" title={item.notes}>{item.notes}</td>
                      <td className="p-2.5">
                        <button
                          onClick={() => { setSelectedItem(item); setDetailOpen(true); }}
                          className="text-[9px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataContainer>
      </div>

      {detailOpen && <DetailModal item={selectedItem} onClose={() => { setDetailOpen(false); setSelectedItem(null); }} />}
    </div>
  );
}
