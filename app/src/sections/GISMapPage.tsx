// src/sections/GISMapPage.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Wifi, WifiOff, Flame, Maximize2, Minimize2,
  Search, RotateCcw, AlertTriangle, Phone, Building2, Wrench,
  X, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';
import { useAMap } from '@/hooks/useAMap';
import type { MapUnit } from '@/types/map';
import { typeConfig } from '@/types/map';
import { GANSU_MAP_BOUNDS, bindGansuViewport, resetMapToGansuOverview } from '@/lib/mapUtils';
import { MapTooltip } from '@/components/MapTooltip';
import { logger } from '@/lib/logger';
import { api } from '@/api/client';

function formatUnitTypeLabel(t: unknown): string {
  const n = Number(t);
  if (n === 2) return '重点单位';
  if (n === 3) return '九小场所';
  if (n === 1) return '一般单位';
  return typeof t === 'string' && t ? t : '未知';
}

function mapGisUnitRow(
  u: Record<string, unknown>,
  devices: Record<string, unknown>[],
  activeAlarms: Record<string, unknown>[]
): MapUnit {
  const uid = Number(u.id);
  const unitDevices = devices.filter((d) => Number(d.unit_id) === uid);
  const onlineCount = unitDevices.filter((d) => Number(d.status) === 1).length;
  const faultCount = unitDevices.filter((d) => Number(d.status) !== 1).length;
  const alarmsForUnit = activeAlarms.filter((a) => {
    const rid = a.unit_id != null ? Number(a.unit_id) : NaN;
    if (rid === uid) return true;
    const un = String(a.unit_name ?? '');
    return un && un === String(u.unit_name ?? '');
  });

  const ut = Number(u.unit_type);
  let type: MapUnit['type'] = 'general';
  if (ut === 2) type = 'key';
  else if (ut === 3) type = 'nine-small';

  const rawLat = Number(u.lat);
  const rawLng = Number(u.lng);
  // 无坐标单位标记为 NaN，前端不渲染地图标记但保留列表展示
  const lat = rawLat || NaN;
  const lng = rawLng || NaN;

  return {
    id: String(u.id ?? ''),
    name: String(u.unit_name ?? `单位${u.id}`),
    lat,
    lng,
    type,
    unitType: formatUnitTypeLabel(u.unit_type),
    address: String(u.address ?? ''),
    online: unitDevices.length === 0 ? Number(u.status) === 1 : onlineCount >= Math.ceil(unitDevices.length / 2),
    alarm: alarmsForUnit.length,
    fault: faultCount,
    devices: unitDevices.length,
    controlRoom: false,
  };
}

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

      // 添加控件
      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ToolBar());
      map.addControl(new AMap.ControlBar());

      // 绑定甘肃视野
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

    // 1. 立即尝试
    if (tryInit()) return;
    logger.warn('[GIS] 初始尺寸为0，启动ResizeObserver监听...');

    // 2. ResizeObserver 监听尺寸变化
    const observer = new ResizeObserver(() => {
      if (tryInit()) {
        observer.disconnect();
      }
    });
    observer.observe(container);

    // 3. requestAnimationFrame 循环检测（备用）
    let rafId = 0;
    let checkCount = 0;
    const checkLoop = () => {
      checkCount++;
      if (tryInit()) {
        observer.disconnect();
        return;
      }
      if (checkCount < 300) { // 最多检测5秒 (60fps * 5)
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

  // 当 units 或地图就绪时渲染标记点
  useEffect(() => {
    if (!mapRef.current || !AMap || units.length === 0) return;
    // 延迟一帧确保地图容器已布局
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      // 清除旧标记
      const existing = map.getAllOverlays('marker');
      if (existing?.length) map.remove(existing);

      units.forEach((unit) => {
        // 跳过无有效坐标的单位（不渲染地图标记，但保留侧边栏列表）
        if (!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) {
          return;
        }

        const cfg = typeConfig(unit.type);
        const hasAlarm = unit.alarm > 0;
        const hasFault = unit.fault > 0;
        const isOffline = !unit.online;

        // 告警优先色 > 故障色 > 类型色
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
    // 仅对有效坐标单位移动地图
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
            </CardContent>
          </Card>
        </div>

        {/* 统计卡片 */}
        <div className="flex items-center gap-3">
          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="px-4 py-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-xs">单位总数</span>
                <Badge className="ml-2 bg-blue-600">{stats.total}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-slate-400 text-xs">在线</span>
                <Badge className="ml-2 bg-green-600">{stats.online}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="px-4 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-slate-400 text-xs">告警</span>
                <Badge className="ml-2 bg-red-600">{stats.alarm}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
            <CardContent className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-400 text-xs">故障</span>
                <Badge className="ml-2 bg-yellow-600">{stats.fault}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 侧边栏 */}
      <div
        className={`absolute left-4 top-20 bottom-4 z-20 transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}
      >
        <Card className="h-full bg-slate-900/90 backdrop-blur-md border-slate-700 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedUnit?.id === unit.id
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                  }`}
                  onClick={() => handleUnitClick(unit)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: typeConfig(unit.type).color }}
                      />
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {unit.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) && (
                        <Badge className="bg-slate-600 text-[10px]">未定位</Badge>
                      )}
                      {unit.alarm > 0 && (
                        <Badge className="bg-red-600 text-xs">{unit.alarm}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      {unit.online ? (
                        <Wifi className="w-3 h-3 text-green-400" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-400" />
                      )}
                      {unit.online ? '在线' : '离线'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      {unit.devices} 设备
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 地图容器 */}
      <div
        ref={mapContainerRef}
        className="flex-1 relative z-0"
        onClick={handleMapClick}
      />

      {/* 选中单位详情弹窗 */}
      {selectedUnit && (
        <div className="absolute bottom-4 right-4 z-20 w-96">
          <Card className="bg-slate-900/95 backdrop-blur-md border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: typeConfig(selectedUnit.type).color }}
                  />
                  <div>
                    <h3 className="font-bold text-slate-100">{selectedUnit.name}</h3>
                    <span className="text-xs text-slate-400">{typeConfig(selectedUnit.type).label}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUnit(null)}
                  className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{selectedUnit.unitType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{selectedUnit.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUnit.online ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className={selectedUnit.online ? 'text-green-400' : 'text-red-400'}>
                    {selectedUnit.online ? '在线' : '离线'}
                  </span>
                  {(!selectedUnit.lng || !selectedUnit.lat || Number.isNaN(selectedUnit.lng) || Number.isNaN(selectedUnit.lat)) && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">未定位</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {selectedUnit.devices} 设备
                  </span>
                  {selectedUnit.alarm > 0 && (
                    <span className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      {selectedUnit.alarm} 告警
                    </span>
                  )}
                </div>
                {selectedUnit.manager && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">{selectedUnit.manager}</span>
                    {selectedUnit.managerPhone && (
                      <span className="text-slate-300 ml-auto">{selectedUnit.managerPhone}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 工具提示 */}
      {tooltipUnit && (
        <MapTooltip unit={tooltipUnit} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  );
}