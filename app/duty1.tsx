import { useState, useEffect } from "react";
import { useToast } from "@/core/ToastContext";
import { dutyShiftService } from "@/api/services";
import DataContainer from "@/components/DataContainer";
import {
  Calendar, Clock, Plus, X, Save, Users, ChevronLeft, ChevronRight,
  Sun, Sunset, Moon, Shield
} from "lucide-react";

/* ===== Types ===== */
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

/* ===== Mock Week Data ===== */
function generateWeekData(): DaySchedule[] {
  const base = new Date();
  base.setDate(base.getDate() - base.getDay() + 1);
  return WEEK_DAYS.map((dow, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    const dateStr = ${date.getMonth() + 1}/;
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
