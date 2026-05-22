/**
 * 大屏地图面板 — 简化版GIS点位概览
 * 只展示单位点位和告警分布，无侧边栏/搜索/详情交互
 */
import { useState, useEffect, useRef } from 'react';
import { useAMap } from '@/hooks/useAMap';
import { api } from '@/api/client';
import { logger } from '@/lib/logger';
import { mapGisUnitRow } from '@/sections/gisMap/utils';
import type { MapUnit } from '@/types/map';
import { typeConfig } from '@/types/map';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';

export default function ScreenMapPanel() {
  const { loading: mapLoading, loaded, error: mapError, AMap } = useAMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 加载GIS点位数据
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDataLoading(true);
        const res = await api.get<{
          units: Record<string, unknown>[];
          devices: Record<string, unknown>[];
          activeAlarms: Record<string, unknown>[];
        }>('/gis/points');
        if (cancelled) return;
        if (res.code !== 200 || !res.data) {
          setUnits([]);
          return;
        }
        const { units: rawUnits = [], devices = [], activeAlarms = [] } = res.data;
        setUnits(rawUnits.map((row) => mapGisUnitRow(row, devices, activeAlarms)));
      } catch (err) {
        if (!cancelled) {
          logger.error('[大屏地图] 加载数据失败:', err);
          setDataError(err instanceof Error ? err.message : String(err));
          setUnits([]);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!loaded || !AMap || !containerRef.current) return;
    const container = containerRef.current;
    let initialized = false;

    function initMap() {
      if (initialized) return;
      initialized = true;
      const map = new AMap.Map(container, {
        zoom: 7,
        center: [103.8, 36.1],
        resizeEnable: true,
        rotateEnable: false,
        pitchEnable: false,
        mapStyle: 'amap://styles/darkblue',
      });
      mapRef.current = map;
      setMapReady(true);
      logger.info('[大屏地图] 初始化完成');
    }

    function tryInit() {
      if (initialized) return true;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        initMap();
        return true;
      }
      return false;
    }

    if (tryInit()) return;

    const observer = new ResizeObserver(() => {
      if (tryInit()) observer.disconnect();
    });
    observer.observe(container);

    let rafId = 0;
    let checkCount = 0;
    const checkLoop = () => {
      checkCount++;
      if (tryInit()) { observer.disconnect(); return; }
      if (checkCount < 300) rafId = requestAnimationFrame(checkLoop);
      else observer.disconnect();
    };
    rafId = requestAnimationFrame(checkLoop);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      mapRef.current?.destroy?.();
    };
  }, [loaded, AMap]);

  // 渲染标记点
  useEffect(() => {
    if (!AMap || units.length === 0) return;
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map || !mapReady) return;

      const existing = map.getAllOverlays('marker');
      if (existing?.length) map.remove(existing);

      units.forEach((unit) => {
        if (!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) return;

        const cfg = typeConfig(unit.type);
        const hasAlarm = unit.alarm > 0;
        const hasFault = unit.fault > 0;
        const isOffline = !unit.online;

        const glowColor = hasAlarm ? '#ef4444' : hasFault ? '#f59e0b' : cfg.color;
        const bgColor = isOffline ? '#64748b' : glowColor;
        const opacity = isOffline ? '0.5' : '1';

        const html = `
          <div class="gis-marker-wrap" style="opacity:${opacity};color:${glowColor}">
            <div class="gis-marker-dot" style="background:${bgColor};border-color:#fff"></div>
            ${hasAlarm ? `<div class="gis-marker-pulse" style="border-color:${glowColor}"></div>` : ''}
            ${unit.alarm > 0 ? `<div class="gis-marker-badge">${unit.alarm}</div>` : ''}
          </div>
        `;

        const marker = new AMap.Marker({
          position: [unit.lng, unit.lat],
          content: html,
          offset: new AMap.Pixel(-24, -40),
        });
        map.add(marker);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [units, AMap, mapReady]);

  // 统计
  const stats = (() => {
    const total = units.length;
    const alarm = units.reduce((s, u) => s + u.alarm, 0);
    const fault = units.reduce((s, u) => s + u.fault, 0);
    const online = units.filter((u) => u.online).length;
    return { total, alarm, fault, online };
  })();

  const isLoading = mapLoading || dataLoading;
  const error = mapError || dataError;

  return (
    <div className="relative w-full h-full flex flex-col bs-map-panel tech-card overflow-hidden">
      {/* 角标装饰 */}
      <div className="bs-corner-tl" />
      <div className="bs-corner-tr" />
      <div className="bs-corner-bl" />
      <div className="bs-corner-br" />

      {/* 扫描线 */}
      <div className="bs-scan-line" />

      {/* 标题栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-slate-950/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-medium text-cyan-400 tracking-wider">单位点位分布</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500">共 <span className="text-slate-300 font-mono">{stats.total}</span> 家</span>
          {stats.alarm > 0 && (
            <span className="text-[9px] text-red-400 animate-pulse">● 告警 {stats.alarm}</span>
          )}
          {stats.fault > 0 && (
            <span className="text-[9px] text-amber-400">● 故障 {stats.fault}</span>
          )}
        </div>
      </div>

      {/* 地图容器 */}
      <div ref={containerRef} className="flex-1 relative z-0" />

      {/* 加载态 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-cyan-500/5 animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-500 mt-2">地图加载中...</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <span className="text-[10px] text-slate-400 max-w-[80%] text-center">{error}</span>
        </div>
      )}

      {/* 图例 */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-slate-950/60 border border-slate-700/30 backdrop-blur-sm">
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[9px] text-slate-400">告警</span></div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[9px] text-slate-400">故障</span></div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] text-slate-400">正常</span></div>
      </div>
    </div>
  );
}
