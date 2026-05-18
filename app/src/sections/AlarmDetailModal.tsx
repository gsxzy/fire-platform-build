import { useEffect } from 'react';
import {
  X, Flame, Loader2, MapPinned, Radio, CheckCircle, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AlarmDetailModalProps } from './alarmDetailModal/types';
import { useAlarmDetail } from './alarmDetailModal/hooks';
import InfoGrid from './alarmDetailModal/components/InfoGrid';
import FloorPlanPanel from './alarmDetailModal/components/FloorPlanPanel';
import ConfirmPanel from './alarmDetailModal/components/ConfirmPanel';
import VideoMonitor from './alarmDetailModal/components/VideoMonitor';
import RecordTabs from './alarmDetailModal/components/RecordTabs';

export default function AlarmDetailModal({ alarm, onClose }: AlarmDetailModalProps) {
  const {
    detail, loading,
    activeTab, setActiveTab,
    confirmType, setConfirmType,
    remark, setRemark,
    videoUrl, videoLoading, videoPlaying, setVideoPlaying,
    recording, recordedBlob,
    showFloorPlan, setShowFloorPlan,
    handleCall,
    startRecording, stopRecording, playRecording,
    handleSubmit,
    processSteps, dutyRecords,
    statusInfo, typeInfo,
    unitName, alarmTime, location,
    controlRoom, floorPlan, cameras,
    dutyPhone, crManager, crManagerPhone,
  } = useAlarmDetail(alarm);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const onSubmit = async () => {
    await handleSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[1100px] max-h-[92vh] bg-slate-800/95 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col m-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-slate-100">报警详情</h3>
            <span className="text-[10px] text-slate-500 font-mono">工单编号：{detail?.alarm_no || alarm?.alarmNo || alarm?.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFloorPlan(!showFloorPlan)}
              className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-500/30 transition-colors flex items-center gap-1"
            >
              <MapPinned className="w-3 h-3" />{showFloorPlan ? '隐藏' : '查看'}平面图
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors" aria-label="关闭">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== Loading State ===== */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-500">加载告警详情...</span>
            </div>
          </div>
        )}

        {/* ===== Content ===== */}
        {!loading && detail && (
          <>
            {/* Process Timeline */}
            <div className="px-5 py-3 border-b border-slate-700/50 flex-shrink-0 bg-slate-800/50">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-[11px] left-8 right-8 h-0.5 bg-slate-700/50 z-0" />
                {processSteps.map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center gap-1" style={{ width: '22%' }}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.completed
                        ? 'bg-blue-500 border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]'
                        : step.active
                        ? 'bg-amber-500 border-amber-400 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-700 border-slate-600'
                    }`}>
                      {step.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      {step.active && <Radio className="w-3 h-3 text-white" />}
                      {!step.completed && !step.active && <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                    </div>
                    <span className={`text-[10px] font-medium ${step.completed ? 'text-blue-400' : step.active ? 'text-amber-400' : 'text-slate-500'}`}>{step.label}</span>
                    <span className="text-[8px] text-slate-600 text-center leading-tight px-1">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-0 min-h-0">
                {/* ===== LEFT: Detail Info ===== */}
                <div className={`${showFloorPlan ? 'w-[40%]' : 'w-[58%]'} border-r border-slate-700/50 p-4 space-y-3 transition-all`}>
                  <InfoGrid
                    detail={detail}
                    unitName={unitName}
                    statusInfo={statusInfo}
                    typeInfo={typeInfo}
                    alarmTime={alarmTime}
                    location={location}
                    controlRoom={controlRoom}
                    dutyPhone={dutyPhone}
                    crManager={crManager}
                    crManagerPhone={crManagerPhone}
                    onCall={handleCall}
                  />

                  {showFloorPlan && (
                    <FloorPlanPanel floorPlan={floorPlan} location={location} />
                  )}

                  <ConfirmPanel
                    confirmType={confirmType}
                    onConfirmTypeChange={setConfirmType}
                    remark={remark}
                    onRemarkChange={setRemark}
                    recording={recording}
                    recordedBlob={recordedBlob}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onPlayRecording={playRecording}
                  />
                </div>

                {/* ===== RIGHT: Video + Records ===== */}
                <div className={`${showFloorPlan ? 'w-[60%]' : 'w-[42%]'} flex flex-col`}>
                  {/* Address & Time */}
                  <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/30 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] text-slate-200">{detail.unit?.address || location}</span>
                    <span className="text-[9px] text-slate-500 ml-auto font-mono">
                      {new Date().toLocaleString('zh-CN')}
                    </span>
                  </div>

                  <div className="flex-shrink-0 p-3">
                    <VideoMonitor
                      videoUrl={videoUrl}
                      videoLoading={videoLoading}
                      videoPlaying={videoPlaying}
                      onTogglePlay={setVideoPlaying}
                      cameras={cameras}
                      controlRoomName={controlRoom?.room_name}
                    />
                  </div>

                  <RecordTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    dutyRecords={dutyRecords}
                    detail={detail}
                  />
                </div>
              </div>
            </div>

            {/* ===== Footer ===== */}
            <div className="px-5 py-3 border-t border-slate-700/50 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-800/50">
              <Button onClick={onClose} variant="outline" className="h-9 px-6 text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
                关闭
              </Button>
              <Button onClick={onSubmit} className="h-9 px-6 text-xs bg-blue-500 hover:bg-blue-600 text-white">
                提交
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
