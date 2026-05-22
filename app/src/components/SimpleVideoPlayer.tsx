import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/* ── 心跳/保活常量 ── */
const HEARTBEAT_INTERVAL = 30000;
const STALL_THRESHOLD = 60000;
const RECOVERY_TIMEOUT = 15000;

export function HlsVideoPlayer({
  src,
  videoRef,
  onError,
}: {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onError?: () => void;
}) {
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const lastFragTimeRef = useRef<number>(Date.now());
  const stalledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const isRecoveringRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    stalledTimerRef.current = null;
    heartbeatRef.current = null;
  }, []);

  const reportError = useCallback(() => {
    if (isRecoveringRef.current) return;
    isRecoveringRef.current = true;
    setError(true);
    onError?.();
    setTimeout(() => { isRecoveringRef.current = false; }, 2000);
  }, [onError]);

  useEffect(() => {
    if (!src || !src.trim()) {
      setError(true);
      onError?.();
      return;
    }
    setError(false);
    retryCountRef.current = 0;
    lastFragTimeRef.current = Date.now();

    const video = videoRef.current;
    if (!video) {
      setError(true);
      onError?.();
      return;
    }

    let destroyed = false;

    const cleanup = () => {
      destroyed = true;
      clearAllTimers();
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
    };

    const handleStalled = () => {
      if (destroyed) return;
      if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = setTimeout(() => {
        if (!destroyed && (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) {
          logger.warn('[SimpleVideo] recovery timeout after stalled');
          reportError();
        }
      }, RECOVERY_TIMEOUT);
    };

    const handlePlaying = () => {
      if (destroyed) return;
      if (stalledTimerRef.current) {
        clearTimeout(stalledTimerRef.current);
        stalledTimerRef.current = null;
      }
      lastFragTimeRef.current = Date.now();
      retryCountRef.current = 0;
    };

    const handleError = () => {
      if (destroyed) return;
      logger.warn('[SimpleVideo] native error:', video.error);
      reportError();
    };

    video.addEventListener('stalled', handleStalled);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    heartbeatRef.current = setInterval(() => {
      if (destroyed) return;
      const idle = Date.now() - lastFragTimeRef.current;
      if (idle > STALL_THRESHOLD) {
        logger.warn(`[SimpleVideo] heartbeat stall, idle=${idle}ms`);
        reportError();
        return;
      }
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused && !video.ended) {
        logger.warn(`[SimpleVideo] heartbeat low readyState=${video.readyState}`);
        video.play().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL);

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
          fragLoadingTimeOut: 10000,
          fragLoadingMaxRetry: 2,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) {
            video.play().catch((err) => logger.warn('[SimpleVideo] autoplay blocked:', err));
          }
        });
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!destroyed) lastFragTimeRef.current = Date.now();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (destroyed) return;
          if (data.fatal) {
            logger.warn('[SimpleVideo] fatal error:', data.type, data.details);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 3) {
              retryCountRef.current++;
              logger.info(`[SimpleVideo] auto-recovery ${retryCountRef.current}/3`);
              hls.startLoad();
              return;
            }
            reportError();
            cleanup();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        const onLoaded = () => {
          if (!destroyed) {
            video.play().catch((err) => logger.warn('[SimpleVideo] autoplay blocked:', err));
          }
        };
        const onErr = () => {
          if (!destroyed) reportError();
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onErr);
        return () => {
          destroyed = true;
          clearAllTimers();
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onErr);
          video.removeEventListener('stalled', handleStalled);
          video.removeEventListener('playing', handlePlaying);
          video.removeEventListener('error', handleError);
          video.pause();
          video.removeAttribute('src');
          video.load();
        };
      } else {
        video.src = src;
        video.play().catch(() => {});
      }
    } catch (e) {
      logger.warn('[SimpleVideo] init error:', e);
      setError(true);
      onError?.();
    }

    return cleanup;
  }, [src, videoRef, onError, clearAllTimers, reportError]);

  if (error) {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-2">
        <div className="text-xs text-red-400">视频加载失败</div>
        <div className="text-[10px] text-slate-500">请检查网络或刷新重试</div>
      </div>
    );
  }

  return <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />;
}

interface SimpleVideoPlayerProps {
  streamUrl: string;
  title: string;
  onClose: () => void;
}

export default function SimpleVideoPlayer({ streamUrl, title, onClose }: SimpleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl mx-4 rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-100">{title}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">实时视频</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video */}
        <div ref={containerRef} className="relative flex-1 bg-black min-h-[400px] group">
          <HlsVideoPlayer src={streamUrl} videoRef={videoRef} />

          {/* Controls */}
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
    </div>
  );
}
