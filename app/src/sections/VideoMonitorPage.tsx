import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Search,
  LayoutGrid,
  Grid3x3,
  Maximize,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  CircleDot,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera as CameraIcon,
  Maximize2,
  MonitorPlay,
  Aperture,
} from 'lucide-react';
import Hls from 'hls.js';
import { cameraService, gb28181Service } from '@/api/services';
import * as videoApi from '@/api/videoService';
import { logger } from '@/lib/logger';

const WVP_ENABLED = import.meta.env.VITE_WVP_ENABLED === 'true';
import DataContainer from '@/components/DataContainer';
import type { Camera as CameraType, GB28181Device } from '@/types/db';

/* ───── HLS Video Player (with external ref support) ───── */
function HlsVideoPlayer({
  src,
  label,
  videoRef: externalRef,
  onError: onErrorProp,
}: {
  src: string;
  label: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onError?: () => void;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef || internalRef;
  const [error, setError] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!src || !src.trim()) {
      setError(true);
      onErrorProp?.();
      return;
    }
    setError(false);

    const video = videoRef.current;
    if (!video) {
      setError(true);
      onErrorProp?.();
      return;
    }

    let destroyed = false;

    const cleanup = () => {
      destroyed = true;
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore cleanup errors */
      }
    };

    try {
      const looksLikeHls =
        src.includes('.m3u8') || src.includes('/hls.') || /\.m3u8(\?|$)/i.test(src);
      if (Hls.isSupported() && looksLikeHls) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: false,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 2,
        });
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) {
            video.play().catch((err) => {
              logger.warn('[HLS] autoplay blocked:', err);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (destroyed) return;
          if (data.fatal) {
            logger.warn('[HLS] fatal error:', data.type, data.details);
            setError(true);
            onErrorProp?.();
            cleanup();
          } else {
            logger.warn('[HLS] non-fatal error:', data.type, data.details);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        const onLoaded = () => {
          if (!destroyed) {
            video.play().catch((err) => {
              console.warn('[Video] autoplay blocked:', err);
            });
          }
        };
        const onErr = () => {
          if (!destroyed) {
            setError(true);
            onErrorProp?.();
          }
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onErr);

        return () => {
          destroyed = true;
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onErr);
          video.pause();
          video.removeAttribute('src');
          video.load();
        };
      } else {
        setError(true);
        onErrorProp?.();
      }
    } catch (e) {
      logger.warn('[HLS] init error:', e);
      setError(true);
      onErrorProp?.();
    }

    return cleanup;
  }, [src, onErrorProp]);

  if (error) {
    return <SimulatedVideo label={label} />;
  }

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      className="w-full h-full rounded bg-black"
      style={{ objectFit: 'cover' }}
    />
  );
}

/* ───── Simulated Video (Canvas fallback) ───── */
function SimulatedVideo({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf: number;
    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for (let i = 0; i < h; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);

      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      const x = w * 0.3 + Math.sin(frame * 0.015) * w * 0.2;
      const y = h * 0.4 + Math.cos(frame * 0.02) * h * 0.15;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      const cornerSize = 16;
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(([cx, cy]) => {
        ctx.beginPath();
        if (cx === 0) {
          ctx.moveTo(cornerSize, cy); ctx.lineTo(4, cy);
          ctx.lineTo(4, cy === 0 ? cornerSize : cy - cornerSize);
        } else {
          ctx.moveTo(cx - cornerSize, cy); ctx.lineTo(cx - 4, cy);
          ctx.lineTo(cx - 4, cy === 0 ? cornerSize : cy - cornerSize);
        }
        ctx.stroke();
      });

      ctx.fillStyle = '#22c55e';
      ctx.font = '12px monospace';
      ctx.fillText(new Date().toLocaleString('zh-CN'), 12, 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`[模拟画面] ${label}`, 12, 40);

      ctx.fillStyle = '#f59e0b';
      for (let i = 0; i < 4; i++) {
        const barH = 3 + i * 3;
        ctx.fillRect(w - 30 + i * 5, 20 - barH, 3, barH);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [label]);

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-[#0b1220]">
      <canvas ref={canvasRef} width={640} height={360} className="w-full h-full" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />
    </div>
  );
}

type LayoutMode = 1 | 2 | 4 | 9;

/* ═══════════════════════════════════════════════
   Inline Camera Control Panel (non-modal)
   ═══════════════════════════════════════════════ */
function InlineCameraPanel({
  camera,
}: {
  camera: CameraType;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ptzLog, setPtzLog] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>(camera.streamUrl || '');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    const devId = camera.deviceId;
    const chId = camera.channelId;
    if (!streamUrl && devId && chId) {
      setStreamLoading(true);
      setStreamError(null);
      gb28181Service.getStreamUrl(devId, chId)
        .then(res => {
          if (res.data?.streamUrl) {
            setStreamUrl(res.data.streamUrl);
          } else {
            videoApi.getStream(devId, chId)
              .then(s => {
                if (s.streamUrl) {
                  setStreamUrl(s.streamUrl);
                } else {
                  setStreamError('取流返回空地址');
                }
              })
              .catch(err => {
                setStreamError(err?.message || '取流失败');
              });
          }
        })
        .catch(() => {
          videoApi.getStream(devId, chId)
            .then(s => {
              if (s.streamUrl) {
                setStreamUrl(s.streamUrl);
              } else {
                setStreamError('取流返回空地址');
              }
            })
            .catch(err => {
              setStreamError(err?.message || '取流失败');
            });
        })
        .finally(() => setStreamLoading(false));
    }
  }, [camera.deviceId, camera.channelId, streamUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = `snapshot-${camera.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const sendPtz = (cmd: string) => {
    setPtzLog(`${cmd} 指令已发送`);
    setTimeout(() => setPtzLog(null), 1500);
    if (camera.deviceId && camera.channelId) {
      const cmdMap: Record<string, string> = { '上': 'up', '下': 'down', '左': 'left', '右': 'right', '放大': 'zoomIn', '缩小': 'zoomOut' };
      gb28181Service.ptzControl(camera.deviceId, camera.channelId, cmdMap[cmd] || 'stop')
        .catch(err => console.warn('[PTZ] failed:', err));
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row min-h-0">
        {/* Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={containerRef}
            className="relative bg-black aspect-video group"
          >
            {camera.onlineStatus === 'online' ? (
              streamLoading ? (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">正在获取视频流...</span>
                </div>
              ) : streamUrl ? (
                <HlsVideoPlayer
                  src={streamUrl}
                  label={camera.name}
                  videoRef={videoRef}
                />
              ) : (
                <>
                  <SimulatedVideo label={camera.name} />
                  {streamError && (
                    <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <span className="text-xs text-red-300">视频加载失败</span>
                      <span className="text-[10px] text-slate-500 max-w-[80%] text-center">{streamError}</span>
                    </div>
                  )}
                </>
              )
            ) : (
              <SimulatedVideo label={camera.name} />
            )}

            {/* Overlay controls on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button onClick={toggleMute} className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-blue-500"
                />

                <div className="flex-1" />

                <button
                  onClick={takeSnapshot}
                  className="flex items-center gap-1 text-[10px] text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors"
                  title="截图"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  截图
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
                  title={isFullscreen ? '退出全屏' : '全屏'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIVE badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5 border border-white/5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[9px] text-red-400 font-semibold tracking-wide">实时视频</span>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-700/30 bg-slate-800/30 flex flex-col shrink-0">
          {/* PTZ */}
          <div className="p-4 border-b border-slate-700/20">
            <div className="text-[10px] text-slate-400 font-medium mb-3 flex items-center gap-1.5">
              <Aperture className="w-3 h-3" />
              云台控制
            </div>
            <div className="flex flex-col items-center gap-1">
              <PtzBtn icon={<ChevronUp className="w-4 h-4" />} onClick={() => sendPtz('上')} />
              <div className="flex items-center gap-1">
                <PtzBtn icon={<ChevronLeft className="w-4 h-4" />} onClick={() => sendPtz('左')} />
                <PtzBtn icon={<ZoomIn className="w-4 h-4" />} onClick={() => sendPtz('放大')} />
                <PtzBtn icon={<ZoomOut className="w-4 h-4" />} onClick={() => sendPtz('缩小')} />
                <PtzBtn icon={<ChevronRight className="w-4 h-4" />} onClick={() => sendPtz('右')} />
              </div>
              <PtzBtn icon={<ChevronDown className="w-4 h-4" />} onClick={() => sendPtz('下')} />
            </div>
            {ptzLog && (
              <div className="mt-2 text-center text-[9px] text-blue-400 animate-pulse">
                {ptzLog}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-2.5 text-[10px] overflow-y-auto">
            <div className="text-[10px] text-slate-400 font-medium mb-2">摄像头信息</div>
            <InfoRow label="状态" value={camera.onlineStatus === 'online' ? '在线' : '离线'} valueColor={camera.onlineStatus === 'online' ? 'text-emerald-400' : 'text-red-400'} />
            <InfoRow label="位置" value={camera.location} />
            <InfoRow label="类型" value={camera.type} />
            <InfoRow label="单位" value={camera.unitName || camera.unitId} />
            <InfoRow label="分辨率" value="1920×1080" />
            <InfoRow label="码率" value="4Mbps" />
            <InfoRow label="编码" value="H.264" />
            <InfoRow label="帧率" value="25fps" />
            <InfoRow label="协议" value={streamUrl?.includes('.m3u8') ? 'HLS' : streamUrl ? 'FLV' : '未获取'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PtzBtn({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-slate-700/40 border border-slate-600/30 text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30 transition-all active:scale-95"
    >
      {icon}
    </button>
  );
}

function InfoRow({ label, value, valueColor = 'text-slate-300' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

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

/* ───── Stat Card ───── */
function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: React.ReactNode; color: 'blue' | 'emerald' | 'slate';
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', value: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', value: 'text-emerald-400' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'text-slate-400', value: 'text-slate-400' },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl p-3 border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={`${c.icon}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${c.value} tabular-nums`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

/* ───── Camera Card ───── */
function CameraCard({
  camera,
  onClick,
  onDoubleClick,
  isSingle,
}: {
  camera: CameraType;
  onClick: () => void;
  onDoubleClick: () => void;
  isSingle?: boolean;
}) {
  const isOnline = camera.onlineStatus === 'online';
  const clickTimer = useRef<number | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>(camera.streamUrl || '');
  const [streamLoading, setStreamLoading] = useState(false);

  useEffect(() => {
    const devId = camera.deviceId;
    const chId = camera.channelId;
    if (!streamUrl && devId && chId && isOnline) {
      setStreamLoading(true);
      gb28181Service.getStreamUrl(devId, chId)
        .then(res => {
          if (res.data?.streamUrl) {
            setStreamUrl(res.data.streamUrl);
          } else {
            // fallback: try ZLM unified stream
            videoApi.getStream(devId, chId)
              .then(s => { if (s.streamUrl) setStreamUrl(s.streamUrl); })
              .catch(() => {});
          }
        })
        .catch(() => {
          // fallback: try ZLM unified stream
          videoApi.getStream(devId, chId)
            .then(s => { if (s.streamUrl) setStreamUrl(s.streamUrl); })
            .catch(() => {});
        })
        .finally(() => setStreamLoading(false));
    }
  }, [camera.deviceId, camera.channelId, streamUrl, isOnline]);

  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onDoubleClick();
    } else {
      clickTimer.current = window.setTimeout(() => {
        clickTimer.current = null;
        onClick();
      }, 250);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border overflow-hidden flex flex-col transition-all duration-300 ${
        isOnline
          ? 'border-slate-700/40 bg-slate-800/40 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5'
          : 'border-slate-700/20 bg-slate-800/20 opacity-80'
      } ${!isSingle && isOnline ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <div className={`relative ${isSingle ? 'aspect-[16/9]' : 'aspect-video'}`}>
        {isOnline ? (
          <div className="absolute inset-0">
            {streamUrl ? (
              <HlsVideoPlayer src={streamUrl} label={camera.name} />
            ) : streamLoading ? (
              <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] text-slate-400">视频流加载中，请稍候…</span>
              </div>
            ) : (
              <SimulatedVideo label={camera.name} />
            )}

            {/* Scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
              }}
            />

            {/* LIVE badge */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5 border border-white/5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold tracking-wide">LIVE</span>
            </div>

            {/* REC badge */}
            {camera.id.charCodeAt(camera.id.length - 1) % 2 === 0 && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] text-red-400 font-semibold">REC</span>
              </div>
            )}

            {/* Hover actions: grid mode */}
            {!isSingle && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/90 text-white text-[11px] font-medium shadow-lg pointer-events-none">
                  <MonitorPlay className="w-3.5 h-3.5" />
                  双击放大
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50">
              <VideoOff className="w-5 h-5 text-slate-600" />
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-500 block">{camera.onlineStatus === 'offline' ? '设备离线' : '状态未知'}</span>
              <span className="text-[9px] text-slate-600 mt-0.5 block">请检查网络连接</span>
            </div>
          </div>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2.5 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/30' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-200 font-medium truncate">{camera.name}</span>
          <span className="text-[9px] text-slate-500 ml-auto flex-shrink-0">{camera.location}</span>
        </div>
      </div>
    </div>
  );
}


