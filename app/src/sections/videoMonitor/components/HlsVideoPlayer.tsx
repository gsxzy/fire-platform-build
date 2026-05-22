import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { logger } from '@/lib/logger';
import SimulatedVideo from './SimulatedVideo';

interface HlsVideoPlayerProps {
  src: string;
  label: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onError?: () => void;
  /** 是否启用保活心跳（默认 true） */
  keepalive?: boolean;
}

/** 心跳间隔：30 秒检查一次播放健康状态 */
const HEARTBEAT_INTERVAL = 30000;
/** 认为播放停滞的最大无数据时间：60 秒 */
const STALL_THRESHOLD = 60000;
/** 等待流恢复的超时：15 秒 */
const RECOVERY_TIMEOUT = 15000;

export default function HlsVideoPlayer({
  src,
  label,
  videoRef: externalRef,
  onError: onErrorProp,
  keepalive = true,
}: HlsVideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef || internalRef;
  const [error, setError] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  /* ── 重连计数与防抖 ── */
  const retryCountRef = useRef(0);
  const lastFragTimeRef = useRef<number>(Date.now());
  const stalledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecoveringRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (stalledTimerRef.current) {
      clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const reportError = useCallback(() => {
    if (isRecoveringRef.current) return;
    isRecoveringRef.current = true;
    setError(true);
    onErrorProp?.();
    // 2 秒后重置恢复锁，允许再次尝试
    setTimeout(() => {
      isRecoveringRef.current = false;
    }, 2000);
  }, [onErrorProp]);

  useEffect(() => {
    if (!src || !src.trim()) {
      setError(true);
      onErrorProp?.();
      return;
    }
    setError(false);
    retryCountRef.current = 0;
    lastFragTimeRef.current = Date.now();

    const video = videoRef.current;
    if (!video) {
      setError(true);
      onErrorProp?.();
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
        /* ignore cleanup errors */
      }
    };

    /* ── 视频元素原生事件监听（保活） ── */
    const handleStalled = () => {
      if (destroyed) return;
      logger.warn('[HLS] stalled event:', label);
      // stalled 后启动恢复计时器
      if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = setTimeout(() => {
        if (!destroyed && (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) {
          logger.warn('[HLS] recovery timeout after stalled:', label);
          reportError();
        }
      }, RECOVERY_TIMEOUT);
    };

    const handleWaiting = () => {
      if (destroyed) return;
      logger.warn('[HLS] waiting event:', label);
    };

    const handlePlaying = () => {
      if (destroyed) return;
      // 恢复播放时清除停滞计时器
      if (stalledTimerRef.current) {
        clearTimeout(stalledTimerRef.current);
        stalledTimerRef.current = null;
      }
      lastFragTimeRef.current = Date.now();
      retryCountRef.current = 0;
    };

    const handleError = () => {
      if (destroyed) return;
      logger.warn('[Video] native error:', label, video.error);
      reportError();
    };

    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    /* ── 心跳保活：定时检查播放健康状态 ── */
    if (keepalive) {
      heartbeatRef.current = setInterval(() => {
        if (destroyed) return;
        const now = Date.now();
        const idle = now - lastFragTimeRef.current;

        // 1. 检查是否长时间未收到数据
        if (idle > STALL_THRESHOLD) {
          logger.warn(`[HLS] heartbeat stall detected: ${label}, idle=${idle}ms`);
          reportError();
          return;
        }

        // 2. 检查 video readyState
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused && !video.ended) {
          logger.warn(`[HLS] heartbeat low readyState: ${label}, readyState=${video.readyState}`);
          // 轻微停滞，尝试恢复播放
          video.play().catch(() => {});
        }
      }, HEARTBEAT_INTERVAL);
    }

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
            video.play().catch((err) => {
              logger.warn('[HLS] autoplay blocked:', err);
            });
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!destroyed) {
            lastFragTimeRef.current = Date.now();
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (destroyed) return;
          if (data.fatal) {
            logger.warn('[HLS] fatal error:', data.type, data.details, label);
            // 网络错误时尝试自动恢复（最多 3 次）
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 3) {
              retryCountRef.current++;
              logger.info(`[HLS] auto-recovery attempt ${retryCountRef.current}/3:`, label);
              hls.startLoad();
              return;
            }
            reportError();
            cleanup();
          } else {
            logger.warn('[HLS] non-fatal error:', data.type, data.details, label);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        const onLoaded = () => {
          if (!destroyed) {
            video.play().catch((err) => {
              logger.warn('[Video] autoplay blocked:', err);
            });
          }
        };
        const onErr = () => {
          if (!destroyed) {
            reportError();
          }
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onErr);

        return () => {
          destroyed = true;
          clearAllTimers();
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onErr);
          video.removeEventListener('stalled', handleStalled);
          video.removeEventListener('waiting', handleWaiting);
          video.removeEventListener('playing', handlePlaying);
          video.removeEventListener('error', handleError);
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

    return () => {
      destroyed = true;
      clearAllTimers();
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
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
  }, [src, label, onErrorProp, keepalive, videoRef, clearAllTimers, reportError]);

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
