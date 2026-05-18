import { useRef } from 'react';
import { Video, Play, Loader2 } from 'lucide-react';

interface VideoMonitorProps {
  videoUrl: string;
  videoLoading: boolean;
  videoPlaying: boolean;
  onTogglePlay: (playing: boolean) => void;
  cameras: any[];
  controlRoomName?: string;
}

export default function VideoMonitor({
  videoUrl, videoLoading, videoPlaying, onTogglePlay, cameras, controlRoomName,
}: VideoMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      onTogglePlay(true);
    } else {
      videoRef.current.pause();
      onTogglePlay(false);
    }
  };

  const handleOverlayPlay = () => {
    videoRef.current?.play();
    onTogglePlay(true);
  };

  return (
    <div className="relative rounded-lg border border-slate-700/50 overflow-hidden bg-slate-900" style={{ height: 200 }}>
      {videoLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            onClick={handlePlayPause}
          />
          {/* Play overlay when paused */}
          {!videoPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <button
                onClick={handleOverlayPlay}
                className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
              >
                <Play className="w-5 h-5 text-white ml-0.5" />
              </button>
            </div>
          )}
        </>
      ) : cameras.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] text-slate-500">未配置关联摄像头</p>
            <p className="text-[9px] text-slate-600 mt-1">请在设备管理中绑定摄像头</p>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] text-slate-500">视频加载失败</p>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/40 to-transparent">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[7px] text-red-400 font-bold">REC</span>
        </div>
        <span className="text-[8px] text-slate-400 font-mono">
          {cameras[0]?.name || 'Camera 01'}
        </span>
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-1.5 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between">
        <span className="text-[8px] text-slate-300">{controlRoomName || '消控室'}</span>
        <div className="flex items-center gap-1">
          {cameras.map((cam: any, i: number) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${cam.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-600'}`}
              title={cam.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
