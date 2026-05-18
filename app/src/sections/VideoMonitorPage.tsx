import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Video, Search, LayoutGrid, Grid3x3, Maximize,
  X, CircleDot, Wifi, WifiOff, RefreshCw, AlertCircle,
} from 'lucide-react';
import { cameraService, gb28181Service } from '@/api/services';
import * as videoApi from '@/api/videoService';

const WVP_ENABLED = import.meta.env.VITE_WVP_ENABLED === 'true';
import DataContainer from '@/components/DataContainer';
import type { Camera as CameraType, GB28181Device } from '@/types/db';

import InlineCameraPanel from './videoMonitor/components/InlineCameraPanel';
import CameraCard from './videoMonitor/components/CameraCard';
import StatCard from './videoMonitor/components/StatCard';

type LayoutMode = 1 | 2 | 4 | 9;

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function VideoMonitorPage() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(4);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const loadCameras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WVP 真实模式下只取 GB28181 设备，避免 cameraService fallback mock 混入模拟数据
      if (WVP_ENABLED) {
        const gbRes = await gb28181Service.list({ pageSize: 999 });
        const gbDevices: GB28181Device[] = Array.isArray(gbRes.data?.list) ? gbRes.data.list : [];
        const gbCameras: CameraType[] = gbDevices.flatMap(d =>
          (d.channels || []).map(ch => ({
            id: ch.channelId,
            name: ch.name || `${d.name}-通道`,
            unitId: d.unitId,
            unitName: d.unitName,
            location: d.location || '',
            rtspUrl: ch.streamUrl,
            streamUrl: ch.streamUrl,
            type: 'outdoor' as const,
            status: 'normal' as const,
            onlineStatus: ch.status === 'on' ? 'online' : 'offline',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            deviceId: d.deviceId,
            channelId: ch.channelId,
          }))
        );
        setCameras(gbCameras);
      } else {
        const [camRes, gbRes, videoRes] = await Promise.allSettled([
          cameraService.list({ pageSize: 999 }),
          gb28181Service.list({ pageSize: 999 }),
          videoApi.getVideoDevices({ count: 999 }),
        ]);
        const camList = camRes.status === 'fulfilled' ? (camRes.value.data?.list || []) : [];
        const gbDevices: GB28181Device[] = gbRes.status === 'fulfilled' ? (gbRes.value.data?.list || []) : [];
        const videoDevices = videoRes.status === 'fulfilled' ? (videoRes.value.list || []) : [];

        const gbCameras: CameraType[] = gbDevices.flatMap(d =>
          (d.channels || []).map(ch => ({
            id: ch.channelId,
            name: ch.name || `${d.name}-通道`,
            unitId: d.unitId,
            unitName: d.unitName,
            location: d.location || '',
            rtspUrl: ch.streamUrl,
            streamUrl: ch.streamUrl,
            type: 'outdoor' as const,
            status: 'normal' as const,
            onlineStatus: ch.status === 'on' ? 'online' : 'offline',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            deviceId: d.deviceId,
            channelId: ch.channelId,
          }))
        );

        // ZLM 直连摄像头
        const zlmCameras: CameraType[] = videoDevices.map((d: any) => ({
          id: d.deviceId,
          name: d.name || d.deviceId,
          unitId: '',
          unitName: '',
          location: d.ip || '',
          rtspUrl: '',
          streamUrl: '',
          type: 'outdoor' as const,
          status: 'normal' as const,
          onlineStatus: d.onLine !== false ? 'online' : 'offline',
          createdAt: '',
          updatedAt: '',
          deviceId: d.deviceId,
          channelId: '1',
        }));

        setCameras([...camList, ...gbCameras, ...zlmCameras]);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const filteredCameras = useMemo(() => {
    let list = cameras;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.onlineStatus === statusFilter);
    }
    return list;
  }, [cameras, searchText, statusFilter]);

  const stats = useMemo(() => {
    const total = cameras.length;
    const online = cameras.filter((c) => c.onlineStatus === 'online').length;
    const offline = cameras.filter((c) => c.onlineStatus === 'offline').length;
    return { total, online, offline };
  }, [cameras]);

  const visibleCameras = useMemo(() => {
    if (layoutMode === 1 && selectedCameraId) {
      return filteredCameras.filter((c) => c.id === selectedCameraId);
    }
    if (layoutMode === 2) {
      return filteredCameras.slice(0, 2);
    }
    if (layoutMode === 4) {
      return filteredCameras.slice(0, 4);
    }
    if (layoutMode === 9) {
      return filteredCameras.slice(0, 9);
    }
    return filteredCameras;
  }, [filteredCameras, layoutMode, selectedCameraId]);

  const handleCameraClick = (_camera: CameraType) => {
    // 单击不再切换布局，视频保持播放
  };

  const handleCameraDoubleClick = (camera: CameraType) => {
    if (layoutMode !== 1) {
      setLayoutMode(1);
      setSelectedCameraId(camera.id);
    }
  };

  const handleBackToGrid = () => {
    setLayoutMode(4);
    setSelectedCameraId(null);
  };

  const gridCols = layoutMode === 1 ? 'grid-cols-1' : layoutMode === 2 ? 'grid-cols-1 md:grid-cols-2' : layoutMode === 4 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header - glass style + responsive */}
      <div className="flex items-center gap-3 shrink-0 glass rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
          <Video className="w-5 h-5 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold text-slate-100 leading-tight">视频监控</h2>
          <p className="text-[10px] text-slate-500 hidden sm:block">实时视频与AI识别</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <StatCard label="总通道" value={stats.total} unit="路" icon={<CircleDot className="w-3.5 h-3.5" />} color="blue" />
        <StatCard label="在线" value={stats.online} unit="路" icon={<Wifi className="w-3.5 h-3.5" />} color="emerald" />
        <StatCard label="离线" value={stats.offline} unit="路" icon={<WifiOff className="w-3.5 h-3.5" />} color="slate" />
      </div>

      {/* Toolbar - glass style */}
      <div className="flex flex-wrap items-center gap-3 shrink-0 glass rounded-xl px-3 py-2">
        <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
          {([
            { mode: 1 as LayoutMode, icon: <Maximize className="w-3.5 h-3.5" />, title: '1画面' },
            { mode: 2 as LayoutMode, icon: <LayoutGrid className="w-3.5 h-3.5" />, title: '2画面' },
            { mode: 4 as LayoutMode, icon: <Grid3x3 className="w-3.5 h-3.5" />, title: '4画面' },
            { mode: 9 as LayoutMode, icon: <Grid3x3 className="w-3.5 h-3.5" />, title: '9画面' },
          ] as const).map((item) => (
            <button
              key={item.mode}
              onClick={() => { setLayoutMode(item.mode); setSelectedCameraId(null); }}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                layoutMode === item.mode
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              title={item.title}
            >
              {item.icon}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索摄像头..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/40 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all w-48"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {([
            { k: 'all' as const, l: '全部' },
            { k: 'online' as const, l: '在线' },
            { k: 'offline' as const, l: '离线' },
          ] as const).map((f) => (
            <button
              key={f.k}
              onClick={() => setStatusFilter(f.k)}
              className={`text-[10px] px-3 py-1.5 rounded-md transition-all duration-200 font-medium ${
                statusFilter === f.k
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {layoutMode === 1 && selectedCameraId && (
          <button
            onClick={handleBackToGrid}
            className="text-[10px] px-3 py-1.5 rounded-md bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 flex items-center gap-1 transition-all border border-slate-700/30"
          >
            <LayoutGrid className="w-3 h-3" />
            返回多画面
          </button>
        )}
      </div>

      {(searchText || statusFilter !== 'all') && (
        <div className="shrink-0 text-[10px] text-slate-500">
          筛选结果：{filteredCameras.length} / {cameras.length} 路
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <DataContainer loading={loading} error={error} data={cameras} onRetry={loadCameras} emptyText="暂无摄像头数据">
          <div className={`grid ${gridCols} gap-3`}>
            {visibleCameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onClick={() => handleCameraClick(camera)}
                onDoubleClick={() => handleCameraDoubleClick(camera)}
                isSingle={layoutMode === 1}
              />
            ))}
            {visibleCameras.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-12 gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <span className="text-sm">
                  {layoutMode === 1 && selectedCameraId ? '该摄像头不在当前筛选范围内' : '没有匹配的摄像头'}
                </span>
                {(searchText || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchText(''); setStatusFilter('all'); }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    清除筛选条件
                  </button>
                )}
              </div>
            )}
          </div>
        </DataContainer>
      </div>

      {/* Inline camera control panel (single mode) */}
      {layoutMode === 1 && selectedCameraId && (
        <InlineCameraPanel camera={visibleCameras[0]} />
      )}
    </div>
  );
}

