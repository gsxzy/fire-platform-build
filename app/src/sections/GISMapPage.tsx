// src/sections/GISMapPage.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Maximize2, Minimize2,
  Search, RotateCcw, AlertTriangle,
  PanelLeftOpen, PanelLeftClose, Layers
} from 'lucide-react';
import { useAMap } from '@/hooks/useAMap';
import type { MapUnit } from '@/types/map';
import { typeConfig } from '@/types/map';
import { GANSU_MAP_BOUNDS, bindGansuViewport, resetMapToGansuOverview } from '@/lib/mapUtils';
import { MapTooltip } from '@/components/MapTooltip';
import { logger } from '@/lib/logger';
import { api } from '@/api/client';
import { mapGisUnitRow } from './gisMap/utils';
import StatCards from './gisMap/components/StatCards';
import UnitSidebar from './gisMap/components/UnitSidebar';
import UnitDetailCard from './gisMap/components/UnitDetailCard';

export default function GISMapPage() {
  const { loading, loaded, error, AMap } = useAMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<MapUnit | null>(null);
  const [tooltipUnit, setTooltipUnit] = useState<MapUnit | null>(null);
  const [tooltipPos] = useState({ x: 0, y: 0 });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gisDataError, setGisDataError] = useState<string | null>(null);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Array<{ lng: number; lat: number; weight: number }>>([]);

  // 加载 GIS 点位（单位 + 设备 + 活跃告警聚合）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGisDataError(null);
        const res = await api.get<{ units: Record<string, unknown>[]; devices: Record<string, unknown>[]; activeAlarms: Record<string, unknown>[] }>(
          '/gis/points'
        );
        if (cancelled) return;
        if (res.code !== 200 || !res.data) {
          setUnits([]);
          return;
        }
        const { units: rawUnits = [], devices = [], activeAlarms = [] } = res.data;
        const mapped = rawUnits.map((row) => mapGisUnitRow(row, devices, activeAlarms));
        setUnits(mapped);
      } catch (err) {
        if (!cancelled) {
          logger.error('[GIS] 加载地图数据失败:', err);
          setGisDataError(err instanceof Error ? err.message : String(err));
          setUnits([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载告警热力图数据
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Array<{ lng: number; lat: number; weight: number }>>('/gis/alarm-heatmap');
        if (cancelled) return;
        if (res.code === 200 && res.data) setHeatmapData(res.data);
      } catch (err) {
        logger.warn('[GIS] 热力图数据加载失败:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!loaded || !AMap || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    let initialized = false;

    function initMap() {
      if (initialized) return;
      initialized = true;

      const map = new AMap.Map(container, {
        zoom: GANSU_MAP_BOUNDS.defaultZoom,
        center: [...GANSU_MAP_BOUNDS.center],
        resizeEnable: true,
        rotateEnable: false,
        pitchEnable: false,
        mapStyle: 'amap://styles/darkblue',
      });

      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ToolBar());
      map.addControl(new AMap.ControlBar());

      bindGansuViewport(map, AMap);

      mapRef.current = map;
      logger.info('[GIS] 地图初始化完成');
    }

    function tryInit() {
      if (initialized) return true;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        logger.info('[GIS] 容器尺寸就绪:', rect.width, 'x', rect.height);
        initMap();
        return true;
      }
      return false;
    }

    if (tryInit()) return;
    logger.warn('[GIS] 初始尺寸为0，启动ResizeObserver监听...');

    const observer = new ResizeObserver(() => {
      if (tryInit()) {
        observer.disconnect();
      }
    });
    observer.observe(container);

    let rafId = 0;
    let checkCount = 0;
    const checkLoop = () => {
      checkCount++;
      if (tryInit()) {
        observer.disconnect();
        return;
      }
      if (checkCount < 300) {
        rafId = requestAnimationFrame(checkLoop);
      } else {
        observer.disconnect();
        logger.error('[GIS] 5秒内容器尺寸始终为0，CSS布局可能有问题');
      }
    };
    rafId = requestAnimationFrame(checkLoop);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      mapRef.current?.destroy?.();
    };
  }, [loaded, AMap]);

  // 热力图层控制
  useEffect(() => {
    if (!mapRef.current || !AMap) return;
    const map = mapRef.current as any;
    if (!heatmapVisible) {
      if (map.__heatmap) {
        map.__heatmap.hide();
      }
      return;
    }
    if (heatmapData.length === 0) return;

    if (map.__heatmap) {
      map.__heatmap.show();
      map.__heatmap.setDataSet({ data: heatmapData, max: 1.0 });
      return;
    }

    AMap.plugin(['AMap.HeatMap'], () => {
      if (!mapRef.current) return;
      const heatmap = new (AMap as any).HeatMap(mapRef.current, {
        radius: 25,
        opacity: [0, 0.8],
      });
      heatmap.setDataSet({ data: heatmapData, max: 1.0 });
      map.__heatmap = heatmap;
    });
  }, [heatmapVisible, heatmapData, AMap]);

  // 当 units 或地图就绪时渲染标记点
  useEffect(() => {
    if (!mapRef.current || !AMap || units.length === 0) return;
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      const existing = map.getAllOverlays('marker');
      if (existing?.length) map.remove(existing);

      units.forEach((unit) => {
        if (!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) {
          return;
        }

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
            <div class="gis-marker-label">${unit.name}</div>
          </div>
        `;

        const marker = new AMap.Marker({
          position: [unit.lng, unit.lat],
          content: html,
          offset: new AMap.Pixel(-24, -40),
          extData: { unitId: unit.id },
        });

        marker.on('click', (e: any) => {
          e?.stopPropagation?.();
          setSelectedUnit(unit);
          map.setZoomAndCenter(14, [unit.lng, unit.lat]);
        });

        marker.on('mouseover', () => setTooltipUnit(unit));
        marker.on('mouseout', () => setTooltipUnit(null));

        map.add(marker);
      });

      logger.info('[GIS] 标记点渲染完成:', units.length);
    }, 300);
    return () => clearTimeout(timer);
  }, [units, AMap]);

  // 过滤单位
  const filteredUnits = useMemo(() => {
    if (!searchKeyword.trim()) return units;
    const keyword = searchKeyword.toLowerCase();
    return units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(keyword) ||
        unit.address.toLowerCase().includes(keyword) ||
        unit.unitType.toLowerCase().includes(keyword)
    );
  }, [units, searchKeyword]);

  // 处理单位点击
  const handleUnitClick = useCallback((unit: MapUnit) => {
    setSelectedUnit(unit);
    if (mapRef.current && AMap && unit.lng && unit.lat && !Number.isNaN(unit.lng) && !Number.isNaN(unit.lat)) {
      mapRef.current.setZoomAndCenter(12, [unit.lng, unit.lat]);
    }
  }, [AMap]);

  // 处理地图点击（清空选中）
  const handleMapClick = useCallback(() => {
    setSelectedUnit(null);
    setTooltipUnit(null);
  }, []);

  // 复位地图
  const handleReset = useCallback(() => {
    if (mapRef.current && AMap) {
      resetMapToGansuOverview(mapRef.current, AMap);
    }
    setSelectedUnit(null);
  }, [AMap]);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    const online = units.filter((u) => u.online).length;
    const alarm = units.reduce((sum, u) => sum + u.alarm, 0);
    const fault = units.reduce((sum, u) => sum + u.fault, 0);
    return { total: units.length, online, alarm, fault };
  }, [units]);

  // 加载状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
        </div>
        <div className="text-slate-400 text-sm">地图与图层数据加载中，请稍候…</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-red-400 font-medium text-lg">地图加载失败</div>
        <div className="text-slate-400 text-sm max-w-md text-center whitespace-pre-wrap">{error}</div>
        <div className="bg-slate-800/80 rounded-lg p-4 max-w-md text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">排查建议：</p>
          <p>1. 检查 .env.production 中 VITE_AMAP_KEY 是否配置正确</p>
          <p>2. 高德地图2.0 必须配置 VITE_AMAP_SECURITY_JS_CODE（安全密钥）</p>
          <p>3. 确认当前域名已添加到高德控制台的 Key 白名单中</p>
          <p>4. 检查浏览器控制台网络请求是否被拦截</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          刷新重试
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative flex-1 flex flex-col transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {gisDataError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-lg px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] text-center">
          图层数据加载失败（地图仍可使用）：{gisDataError}
        </div>
      )}
      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="flex items-center gap-2 px-4 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索单位..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-64 bg-slate-800 border-slate-600 focus:border-blue-500 text-sm"
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="flex items-center gap-4 px-4 py-2">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                title="复位视图"
              >
                <RotateCcw className="w-5 h-5 text-slate-300" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                title={isFullscreen ? '退出全屏' : '全屏'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-slate-300" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-slate-300" />
                )}
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5 text-slate-300" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5 text-slate-300" />
                )}
              </button>
              <button
                onClick={() => setHeatmapVisible(v => !v)}
                className={`p-2 rounded-lg transition-colors ${heatmapVisible ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-slate-700/50 text-slate-300'}`}
                title={heatmapVisible ? '关闭热力图' : '显示告警热力图'}
              >
                <Layers className="w-5 h-5" />
              </button>
            </CardContent>
          </Card>
        </div>

        <StatCards stats={stats} />
      </div>

      <UnitSidebar
        open={sidebarOpen}
        units={filteredUnits}
        selectedUnit={selectedUnit}
        onUnitClick={handleUnitClick}
      />

      {/* 地图容器 */}
      <div
        ref={mapContainerRef}
        className="flex-1 relative z-0"
        onClick={handleMapClick}
      />

      {selectedUnit && (
        <UnitDetailCard unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
      )}

      {/* 工具提示 */}
      {tooltipUnit && (
        <MapTooltip unit={tooltipUnit} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  );
}
