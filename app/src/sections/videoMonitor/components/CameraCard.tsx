import { useState, useEffect, useRef } from 'react';
import { VideoOff, MonitorPlay } from 'lucide-react';
import type { Camera as CameraType } from '@/types/db';
import { gb28181Service } from '@/api/services';
import * as videoApi from '@/api/videoService';
import { logger } from '@/lib/logger';
import HlsVideoPlayer from './HlsVideoPlayer';
import SimulatedVideo from './SimulatedVideo';

interface CameraCardProps {
  camera: CameraType;
  onClick: () => void;
  onDoubleClick: () => void;
  isSingle?: boolean;
}

/** 流 URL 刷新心跳间隔：45 秒 */
const STREAM_REFRESH_INTERVAL = 45000;
/** 错误后刷新延迟：3 秒 */
const ERROR_REFRESH_DELAY = 3000;

export default function CameraCard({ camera, onClick, onDoubleClick, isSingle }: CameraCardProps) {
  const isOnline = camera.onlineStatus === 'online';
  const clickTimer = useRef<number | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>(camera.streamUrl || '');
  const [streamLoading, setStreamLoading] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  /* ── 初始加载 + 心跳刷新 ── */
  useEffect(() => {
    isMountedRef.current = true;

    const loadStream = async (isRefresh = false) => {
      const devId = camera.deviceId;
      const chId = camera.channelId;
      if (!devId || !chId || !isOnline) return;
      if (!isMountedRef.current) return;

      if (!isRefresh) setStreamLoading(true);
      try {
        const res = await gb28181Service.getStreamUrl(devId, chId);
        if (isMountedRef.current && res.data?.streamUrl) {
          setStreamUrl(res.data.streamUrl);
        } else if (isMountedRef.current) {
          const s = await videoApi.getStream(devId, chId);
          if (s.streamUrl) setStreamUrl(s.streamUrl);
        }
      } catch {
        if (isMountedRef.current) {
          try {
            const s = await videoApi.getStream(devId, chId);
            if (s.streamUrl) setStreamUrl(s.streamUrl);
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (isMountedRef.current && !isRefresh) setStreamLoading(false);
      }
    };

    // 首次加载
    if (!streamUrl) {
      loadStream(false);
    }

    // 心跳保活：定时刷新流 URL，保持后端 WVP 会话活跃
    if (isOnline && camera.deviceId && camera.channelId) {
      heartbeatRef.current = setInterval(() => {
        logger.info(`[CameraCard] heartbeat refresh: ${camera.name}`);
        loadStream(true);
      }, STREAM_REFRESH_INTERVAL);
    }

    return () => {
      isMountedRef.current = false;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [camera.deviceId, camera.channelId, camera.onlineStatus, camera.name, isOnline, streamUrl]);

  /* ── 播放器错误回调：延迟后刷新流 URL ── */
  const handlePlayerError = () => {
    logger.warn(`[CameraCard] player error, will refresh: ${camera.name}`);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const devId = camera.deviceId;
      const chId = camera.channelId;
      if (!devId || !chId || !isOnline) return;
      logger.info(`[CameraCard] refreshing stream after error: ${camera.name}`);
      setStreamLoading(true);
      gb28181Service.getStreamUrl(devId, chId)
        .then(res => {
          if (isMountedRef.current && res.data?.streamUrl) {
            setStreamUrl(res.data.streamUrl);
          } else if (isMountedRef.current) {
            videoApi.getStream(devId, chId)
              .then(s => { if (s.streamUrl) setStreamUrl(s.streamUrl); })
              .catch(() => {})
              .finally(() => { if (isMountedRef.current) setStreamLoading(false); });
            return;
          }
          if (isMountedRef.current) setStreamLoading(false);
        })
        .catch(() => {
          videoApi.getStream(devId, chId)
            .then(s => { if (isMountedRef.current && s.streamUrl) setStreamUrl(s.streamUrl); })
            .catch(() => {})
            .finally(() => { if (isMountedRef.current) setStreamLoading(false); });
        });
    }, ERROR_REFRESH_DELAY);
  };

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
              <HlsVideoPlayer
                src={streamUrl}
                label={camera.name}
                onError={handlePlayerError}
                keepalive
              />
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
                  <MonitorPlay className="w-3.5 h-3.5" />双击放大
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
