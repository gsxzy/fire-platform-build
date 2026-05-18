import { Textarea } from '@/components/ui/textarea';
import { Mic, Play, Square } from 'lucide-react';

interface ConfirmPanelProps {
  confirmType: string;
  onConfirmTypeChange: (type: string) => void;
  remark: string;
  onRemarkChange: (value: string) => void;
  recording: boolean;
  recordedBlob: Blob | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
}

export default function ConfirmPanel({
  confirmType, onConfirmTypeChange, remark, onRemarkChange,
  recording, recordedBlob, onStartRecording, onStopRecording, onPlayRecording,
}: ConfirmPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700/30 overflow-hidden">
      <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30 flex items-center justify-between">
        <span className="text-[11px] text-slate-200 font-medium">值守确认</span>
        {/* Recording controls */}
        <div className="flex items-center gap-1.5">
          {recording ? (
            <button
              onClick={onStopRecording}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              <Square className="w-2.5 h-2.5" />停止录音
            </button>
          ) : (
            <button
              onClick={onStartRecording}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
            >
              <Mic className="w-2.5 h-2.5" />录音
            </button>
          )}
          {recordedBlob && (
            <button
              onClick={onPlayRecording}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
            >
              <Play className="w-2.5 h-2.5" />播放
            </button>
          )}
        </div>
      </div>
      <div className="p-3 space-y-3">
        {/* Radio options */}
        <div className="flex flex-wrap gap-3">
          {['真实火警', '误报', '测试', '维保测试'].map(opt => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
              <div
                onClick={() => onConfirmTypeChange(opt)}
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                  confirmType === opt ? 'border-blue-400' : 'border-slate-600'
                }`}
              >
                {confirmType === opt && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </div>
              <span className={`text-[11px] ${confirmType === opt ? 'text-blue-400' : 'text-slate-400'}`}>{opt}</span>
            </label>
          ))}
        </div>
        {/* Remark */}
        <Textarea
          value={remark}
          onChange={e => onRemarkChange(e.target.value)}
          placeholder="请输入备注信息..."
          className="bg-slate-700/30 border-slate-600/30 text-slate-200 text-xs min-h-[50px] resize-none"
        />
      </div>
    </div>
  );
}
