/**
 * 视频联动弹窗 - 对标海康/防火云同款
 * 支持实时预览、抓拍、关闭
 */
import { useState, useEffect, useRef } from 'react';
import { X, Camera, Video, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/types/api';

interface VideoPopupProps {
  open: boolean;
  cameraId?: string;
  channelId?: string;
  cameraName?: string;
  onClose: () => void;
}

export default function VideoPopup({ open, cameraId, channelId, cameraName, onClose }: VideoPopupProps) {
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !cameraId) return;
    loadStream();
  }, [open, cameraId, channelId]);

  const loadStream = async () => {
    setLoading(true);
    setError('');
    try {
      // 调用 WVP-PRO 代理接口获取流地址
      const res = await fetch('/api/video/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sfp_token') || ''}` },
        body: JSON.stringify({ deviceId: cameraId, channelId: channelId || cameraId }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.streamUrl) {
        setStreamUrl(data.data.streamUrl);
      } else {
        setError(data.message || '获取视频流失败');
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const link = document.createElement('a');
    link.download = `snapshot_${cameraId}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center ${fullscreen ? 'p-0' : 'p-4'}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={`relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col ${fullscreen ? 'w-full h-full' : 'w-[640px] max-w-[90vw]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/80">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-slate-200">{cameraName || '实时视频'}</span>
            {cameraId && <span className="text-[10px] text-slate-500">({cameraId})</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSnapshot}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="抓拍"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title={fullscreen ? '退出全屏' : '全屏'}
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Body */}
        <div className="flex-1 bg-black relative min-h-[300px] flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-500">加载视频流...</span>
            </div>
          )}
          {error && !loading && (
            <div className="text-center">
              <p className="text-xs text-red-400 mb-2">{error}</p>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={loadStream}>
                重试
              </Button>
            </div>
          )}
          {streamUrl && !loading && (
            <video
              ref={videoRef}
              src={streamUrl}
              autoPlay
              muted
              controls
              className="w-full h-full object-contain"
              onError={() => setError('视频加载失败')}
            />
          )}
          {!cameraId && !loading && (
            <p className="text-xs text-slate-500">未绑定摄像头</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">视频复核</span>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700" onClick={handleSnapshot}>
              <Camera className="w-3 h-3 mr-1" />抓拍
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
