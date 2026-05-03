import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/core/ToastContext";
import { dutyShiftService, dutyService } from "@/api/services";
import DataContainer from "@/components/DataContainer";
import {
  Calendar, Clock, Plus, X, Save, Users, ChevronLeft, ChevronRight,
  Sun, Sunset, Moon
} from "lucide-react";

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  icon: typeof Sun;
  color: string;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  shiftName: string;
  staffNames: string[];
  status: "scheduled" | "empty";
}

const TEMPLATES: ShiftTemplate[] = [
  { id: "T-001", name: "早班", startTime: "08:00", endTime: "16:00", icon: Sun, color: "text-yellow-400" },
  { id: "T-002", name: "中班", startTime: "16:00", endTime: "00:00", icon: Sunset, color: "text-orange-400" },
  { id: "T-003", name: "晚班", startTime: "00:00", endTime: "08:00", icon: Moon, color: "text-purple-400" },
];

const STAFF_OPTIONS = ["张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十"];
const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function generateWeekData(): DaySchedule[] {
  const base = new Date();
  base.setDate(base.getDate() - base.getDay() + 1);
  return WEEK_DAYS.map((dow, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    const dateStr = (date.getMonth() + 1) + "/" + date.getDate();
    const tmpl = TEMPLATES[i % 3];
    return {
      date: dateStr,
      dayOfWeek: dow,
      shiftName: tmpl.name,
      staffNames: [STAFF_OPTIONS[i % 8], STAFF_OPTIONS[(i + 1) % 8]],
      status: "scheduled" as const,
    };
  });
}

function ScheduleModal({ day, onSave, onClose }: { day: DaySchedule | null; onSave: (data: DaySchedule) => void; onClose: () => void }) {
  const [shiftId, setShiftId] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  useEffect(() => {
    if (day) {
      const tmpl = TEMPLATES.find(t => t.name === day.shiftName);
      setShiftId(tmpl?.id || "");
      setSelectedStaff(day.staffNames || []);
    }
  }, [day]);

  if (!day) return null;

  const toggleStaff = (name: string) => {
    setSelectedStaff(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSave = () => {
    const tmpl = TEMPLATES.find(t => t.id === shiftId);
    onSave({
      ...day,
      shiftName: tmpl?.name || day.shiftName,
      staffNames: selectedStaff,
      status: selectedStaff.length > 0 ? "scheduled" : "empty",
    });
  };

  const staffBtnClass = (name: string) => selectedStaff.includes(name)
    ? "border-blue-500 bg-blue-500/10 text-blue-400"
    : "border-slate-700/30 bg-slate-700/20 text-slate-400 hover:text-slate-200";

  const tmplBtnClass = (id: string) => shiftId === id
    ? "border-blue-500 bg-blue-500/10"
    : "border-slate-700/30 bg-slate-700/20 hover:bg-slate-700/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            排班 - {day.dayOfWeek} ({day.date})
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">选择班次模板</label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setShiftId(t.id)} className={"p-2 rounded border text-center transition-colors " + tmplBtnClass(t.id)}>
                    <Icon className={"w-4 h-4 mx-auto mb-1 " + t.color} />
                    <div className="text-[10px] text-slate-200">{t.name}</div>
                    <div className="text-[8px] text-slate-500">{t.startTime}-{t.endTime}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">选择值班人员</label>
            <div className="grid grid-cols-4 gap-2">
              {STAFF_OPTIONS.map(name => (
                <button key={name} onClick={() => toggleStaff(name)} className={"text-[10px] px-2 py-1.5 rounded border transition-colors " + staffBtnClass(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors">
            <Save className="w-3.5 h-3.5" />保存排班
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DutyShiftPage() {
  const { success } = useToast();
  const [schedules, setSchedules] = useState<DaySchedule[]>(generateWeekData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await dutyService.list({ keyword: weekLabel, pageSize: 10 });
      const list = res.data?.list || [];
      const weekRecord = list.find((item: any) => item.name === weekLabel);
      if (weekRecord?.content) {
        const parsed = JSON.parse(weekRecord.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSchedules(parsed);
          setLoading(false);
          return;
        }
      }
      const res2: any = await dutyShiftService.list({ page: 1, pageSize: 100 });
      const data = Array.isArray(res2?.data) ? res2.data : (res2?.data?.list || []);
      if (data.length > 0) {
        setSchedules(data.map((d: any) => ({
          date: d.date || "",
          dayOfWeek: d.dayOfWeek || "",
          shiftName: d.shiftName || "",
          staffNames: d.staffNames || [],
          status: d.status || "empty",
        })));
      } else {
        setSchedules(generateWeekData());
      }
    } catch (e: any) {
      setError(e);
      setSchedules(generateWeekData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const handleSaveSchedule = async (updated: DaySchedule) => {
    const newSchedules = schedules.map(d => d.date === updated.date && d.dayOfWeek === updated.dayOfWeek ? updated : d);
    setSchedules(newSchedules);
    success("排班保存成功", updated.dayOfWeek + " " + updated.shiftName + " 已更新");
    setModalOpen(false);
    try {
      const payload: any = { name: weekLabel, status: 'active', content: JSON.stringify(newSchedules) };
      const res: any = await dutyService.list({ keyword: weekLabel, pageSize: 10 });
      const existing = res.data?.list?.find((item: any) => item.name === weekLabel);
      if (existing) {
        await dutyService.update(String(existing.id), payload);
      } else {
        await dutyService.create(payload as any);
      }
    } catch (e) { console.error('排班同步后端失败:', e); }
  };

  const weekLabel = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay() + 1 + weekOffset * 7);
    const end = new Date(base);
    end.setDate(base.getDate() + 6);
    return (base.getMonth() + 1) + "/" + base.getDate() + " - " + (end.getMonth() + 1) + "/" + end.getDate();
  }, [weekOffset]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">排班管理</h2>
            <p className="text-[10px] text-slate-500">值班人员排班配置</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">本周</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg border border-slate-700/30 px-2">
            <button onClick={() => setWeekOffset(v => v - 1)} className="p-1 text-slate-400 hover:text-slate-200"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-slate-200 font-mono min-w-[100px] text-center">{weekLabel}</span>
            <button onClick={() => setWeekOffset(v => v + 1)} className="p-1 text-slate-400 hover:text-slate-200"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" />新增班次
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        <div className="w-56 flex-shrink-0 bg-slate-800/50 rounded-lg border border-slate-700/30 p-4 space-y-3">
          <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />班次模板
          </h3>
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={"w-4 h-4 " + t.color} />
                  <span className="text-xs font-medium text-slate-200">{t.name}</span>
                </div>
                <div className="text-[10px] text-slate-500">{t.startTime} - {t.endTime}</div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-hidden flex flex-col">
          <DataContainer loading={loading} error={error} data={schedules} onRetry={fetchData}>
            <div className="grid grid-cols-7 gap-px bg-slate-700/30 flex-1">
              {schedules.map((day, i) => {
                const tmpl = TEMPLATES.find(t => t.name === day.shiftName);
                const Icon = tmpl?.icon || Sun;
                const scheduledClass = "bg-emerald-500/10 text-emerald-400";
                const emptyClass = "bg-slate-700 text-slate-500";
                return (
                  <div key={i} onClick={() => { setSelectedDay(day); setModalOpen(true); }} className="bg-slate-800/80 p-3 cursor-pointer hover:bg-slate-700/40 transition-colors flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{day.dayOfWeek}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{day.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon className={"w-3.5 h-3.5 " + (tmpl?.color || "text-slate-400")} />
                      <span className="text-xs font-medium text-slate-200">{day.shiftName}</span>
                    </div>
                    <div className="flex-1">
                      {day.staffNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {day.staffNames.map((name, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-600">未排班</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className={"text-[9px] px-1.5 py-0.5 rounded " + (day.status === "scheduled" ? scheduledClass : emptyClass)}>
                        {day.status === "scheduled" ? "已排班" : "未排班"}
                      </span>
                      <Users className="w-3 h-3 text-slate-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          </DataContainer>
        </div>
      </div>

      {modalOpen && selectedDay && (
        <ScheduleModal day={selectedDay} onSave={handleSaveSchedule} onClose={() => { setModalOpen(false); setSelectedDay(null); }} />
      )}
    </div>
  );
}
