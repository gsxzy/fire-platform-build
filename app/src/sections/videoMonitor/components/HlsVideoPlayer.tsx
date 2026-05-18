import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { logger } from '@/lib/logger';
import SimulatedVideo from './SimulatedVideo';

interface HlsVideoPlayerProps {
  src: string;
  label: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onError?: () => void;
}

export default function HlsVideoPlayer({ src, label, videoRef: externalRef, onError: onErrorProp }: HlsVideoPlayerProps) {
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
              logger.warn('[Video] autoplay blocked:', err);
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
