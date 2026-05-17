/**
 * ═══════════════════════════════════════════════════════════════════
 * 全局报警弹窗上下文 - 系统级火警弹窗覆盖层
 * ═══════════════════════════════════════════════════════════════════
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { alarmService } from '@/api/services';
import { useToast } from '@/core/ToastContext';
import type { Alarm } from '@/types/db';
import { getErrorMessage } from '@/types/api';
import { logger } from '@/lib/logger';

export interface AlarmPopupData {
  alarm: Alarm;
  unitName: string;
  unitAddress?: string;
  managerName?: string;
  managerPhone?: string;
  dutyOfficerName?: string;
  dutyOfficerPhone?: string;
  safetyOfficerName?: string;
  safetyOfficerPhone?: string;
  snapshots: { imageUrl?: string; cameraName?: string }[];
  relatedCameras: { id: string; name: string; streamUrl?: string }[];
  floorPlan?: { image_url?: string; x?: number; y?: number };
}

interface AlarmPopupContextValue {
  currentAlarm: AlarmPopupData | null;
  isOpen: boolean;
  openAlarm: (data: AlarmPopupData) => void;
  closeAlarm: () => void;
  confirmAlarm: () => void;
  confirmedIds: string[];
}

const AlarmPopupContext = createContext<AlarmPopupContextValue | null>(null);

const STORAGE_KEY = 'sfp_alarm_confirmed_ids';

/* 使用 Web Audio API 播放警报音 */
function playAlarmSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch { /* ignore */ }
}

export function AlarmPopupProvider({ children }: { children: React.ReactNode }) {
  const { error: showError } = useToast();
  const [currentAlarm, setCurrentAlarm] = useState<AlarmPopupData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openAlarm = useCallback((data: AlarmPopupData) => {
    if (confirmedIds.includes(data.alarm.id)) return;
    setCurrentAlarm(data);
    setIsOpen(true);
    playAlarmSound();
  }, [confirmedIds]);

  const closeAlarm = useCallback(() => {
    setIsOpen(false);
  }, []);

  const confirmAlarm = useCallback(async () => {
    if (currentAlarm) {
      try {
        await alarmService.confirm(currentAlarm.alarm.id, '值班人员', '值守确认');
        const newIds = [...confirmedIds, currentAlarm.alarm.id];
        setConfirmedIds(newIds);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
        setIsOpen(false);
      } catch (err: unknown) {
        logger.error('确认报警失败', err);
        showError('确认报警失败', getErrorMessage(err, '请检查网络或稍后重试'));
      }
    }
  }, [currentAlarm, confirmedIds, showError]);

  /* 报警自动弹窗（仅开发/演示环境） */
  useEffect(() => {
    // 生产环境禁用自动弹窗
    if (import.meta.env.PROD) return;

    const tryTrigger = async () => {
      try {
        const res = await alarmService.list({ pageSize: 50 }) as any;
        const alarms: Alarm[] = Array.isArray(res.data) ? res.data : (res.data?.list || []);
        const fireAlarms = alarms.filter((a: Alarm) => a.type === 'fire' && a.status === 'new');
        if (fireAlarms.length === 0) return;
        // 优先选择最新的火警（按 createdAt 降序）
        fireAlarms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const alarm = fireAlarms[0];
        if (confirmedIds.includes(alarm.id)) return;

        const detailRes = await alarmService.getDetail(alarm.id) as any;
        const detail = detailRes.data ?? detailRes;
        if (!detail) return;

        openAlarm({
          alarm,
          unitName: detail.unit_name || detail.unitName || alarm.unitName || '未知单位',
          unitAddress: detail.unit?.address || detail.unitAddress,
          managerName: detail.controlRoom?.managerName || detail.controlRoom?.dutyPerson || detail.controlRoom?.duty_person,
          managerPhone: detail.controlRoom?.managerPhone || detail.controlRoom?.dutyPhone || detail.controlRoom?.duty_phone,
          dutyOfficerName: detail.controlRoom?.dutyOfficerName || detail.controlRoom?.dutyPerson || detail.controlRoom?.duty_person,
          dutyOfficerPhone: detail.controlRoom?.dutyOfficerPhone || detail.controlRoom?.dutyPhone || detail.controlRoom?.duty_phone,
          safetyOfficerName: detail.controlRoom?.safetyOfficerName || detail.controlRoom?.dutyPerson || detail.controlRoom?.duty_person,
          safetyOfficerPhone: detail.controlRoom?.safetyOfficerPhone || detail.controlRoom?.dutyPhone || detail.controlRoom?.duty_phone,
          snapshots: detail.snapshots || [],
          relatedCameras: detail.relatedCameras || [],
          floorPlan: detail.floorPlan,
        });
      } catch (e: any) {
        logger.error('[AlarmPopupContext] 轮询触发失败:', e?.message || e);
      }
    };

    timerRef.current = setInterval(tryTrigger, 45000 + Math.random() * 30000);
    // 首次延迟触发
    const firstTimer = setTimeout(tryTrigger, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(firstTimer);
    };
  }, [openAlarm, confirmedIds]);

  return (
    <AlarmPopupContext.Provider value={{ currentAlarm, isOpen, openAlarm, closeAlarm, confirmAlarm, confirmedIds }}>
      {children}
    </AlarmPopupContext.Provider>
  );
}

export function useAlarmPopup() {
  const ctx = useContext(AlarmPopupContext);
  if (!ctx) throw new Error('useAlarmPopup must be used within AlarmPopupProvider');
  return ctx;
}
