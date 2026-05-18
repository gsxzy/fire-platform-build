import { useState, useEffect, useRef } from 'react';
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Play, Pause, Volume2, VolumeX,
  Camera as CameraIcon, Maximize2, Aperture,
} from 'lucide-react';
import type { Camera as CameraType } from '@/types/db';
import { gb28181Service } from '@/api/services';
import * as videoApi from '@/api/videoService';
import { logger } from '@/lib/logger';
import HlsVideoPlayer from './HlsVideoPlayer';
import SimulatedVideo from './SimulatedVideo';

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

export default function InlineCameraPanel({ camera }: { camera: CameraType }) {
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
        .catch(err => logger.warn('[PTZ] failed:', err));
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 overflow-hidden flex flex-col">
      <div className="flex flex-col lg:flex-row min-h-0">
        {/* Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={containerRef} className="relative bg-black aspect-video group">
            {camera.onlineStatus === 'online' ? (
              streamLoading ? (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">正在获取视频流...</span>
                </div>
              ) : streamUrl ? (
                <HlsVideoPlayer src={streamUrl} label={camera.name} videoRef={videoRef} />
              ) : (
                <>
                  <SimulatedVideo label={camera.name} />
                  {streamError && (
                    <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
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
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={handleVolumeChange} className="w-20 accent-blue-500" />
                <div className="flex-1" />
                <button onClick={takeSnapshot} className="flex items-center gap-1 text-[10px] text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors" title="截图">
                  <CameraIcon className="w-3.5 h-3.5" />截图
                </button>
                <button onClick={toggleFullscreen} className="p-1.5 rounded-md text-white hover:bg-white/10 transition-colors" title={isFullscreen ? '退出全屏' : '全屏'}>
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
              <Aperture className="w-3 h-3" />云台控制
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
              <div className="mt-2 text-center text-[9px] text-blue-400 animate-pulse">{ptzLog}</div>
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
