import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Eye, Trash2, AlertTriangle, MonitorPlay } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import type { FloorDevice, CameraBinding } from '../types';

interface RightPanelProps {
  selectedDevice: FloorDevice | null;
  devices: FloorDevice[];
  filteredDevices: FloorDevice[];
  alarmIds: Set<string>;
  showVideo: boolean;
  linkedCamera: CameraBinding | null;
  onSelectDevice: (d: FloorDevice) => void;
  onClearDevice: () => void;
  onDeletePosition: (positionId: number) => void;
}

export default function RightPanel({
  selectedDevice, devices, filteredDevices, alarmIds,
  showVideo, linkedCamera,
  onSelectDevice, onClearDevice, onDeletePosition,
}: RightPanelProps) {
  const navigate = useNavigate();

  const STATUS_COLOR: Record<number, string> = {
    1: '#10b981', 2: '#f59e0b', 3: '#ef4444', 4: '#64748b',
  };
  const STATUS_LABEL: Record<number, string> = {
    1: '在线', 2: '故障', 3: '离线', 4: '报废',
  };

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 1).length,
    fault: devices.filter(d => d.status === 2).length,
    offline: devices.filter(d => d.status === 3).length,
    alarm: devices.filter(d => alarmIds.has(d.device_id)).length,
  };

  return (
    <Card className="w-72 flex-shrink-0 border-slate-700/50 bg-slate-800/50 flex flex-col">
      <CardContent className="p-3 flex flex-col h-full">
        {!selectedDevice ? (
          <div className="flex-1 flex flex-col">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: '已标点', value: stats.total, valueClass: 'text-blue-400' },
                { label: '在线', value: stats.online, valueClass: 'text-emerald-400' },
                { label: '故障', value: stats.fault, valueClass: 'text-amber-400' },
                { label: '离线', value: stats.offline, valueClass: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-700/20 rounded-lg p-2 text-center">
                  <div className={`text-lg font-bold ${s.valueClass}`}>{s.value}</div>
                  <div className="text-[9px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 设备列表 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
              <div className="text-[10px] text-slate-500 mb-1">楼层设备列表</div>
              {filteredDevices.map(d => (
                <div
                  key={d.position_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/20 hover:bg-slate-700/40 cursor-pointer transition-all"
                  onClick={() => onSelectDevice(d)}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[d.status] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-300 truncate">{d.device_name}</div>
                    <div className="text-[8px] text-slate-500">{d.device_type} · {STATUS_LABEL[d.status]}</div>
                  </div>
                  {alarmIds.has(d.device_id) && (
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  )}
                </div>
              ))}
              {devices.length > 0 && filteredDevices.length === 0 && (
                <div className="text-[10px] text-slate-500 py-3 text-center">无匹配设备</div>
              )}
              {devices.length === 0 && (
                <EmptyState
                  type="data"
                  title="本层暂无已标点设备"
                  description="上传平面图后，在左侧将设备拖放或点击上图，即可在此列表查看。"
                  className="py-4 px-1"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">设备详情</h3>
              <button onClick={onClearDevice} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              <div className="p-3 rounded-lg bg-slate-700/20">
                <div className="text-[10px] text-slate-500">设备名称</div>
                <div className="text-xs text-slate-200 font-medium">{selectedDevice.device_name}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/20">
                <div className="text-[10px] text-slate-500">设备编码</div>
                <div className="text-xs text-slate-200 font-mono">{selectedDevice.device_code}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/20 flex items-center gap-2">
                <div className="text-[10px] text-slate-500">状态</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[selectedDevice.status] }} />
                  <span className="text-xs" style={{ color: STATUS_COLOR[selectedDevice.status] }}>
                    {STATUS_LABEL[selectedDevice.status]}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/20">
                <div className="text-[10px] text-slate-500">平面位置</div>
                <div className="text-xs text-slate-200 font-mono">
                  X: {selectedDevice.x.toFixed(1)}% / Y: {selectedDevice.y.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/20">
                <div className="text-[10px] text-slate-500">设备类型</div>
                <div className="text-xs text-slate-200">{selectedDevice.device_type || '-'}</div>
              </div>

              {/* 视频联动 */}
              {showVideo && linkedCamera && (
                <div className="p-3 rounded-lg bg-slate-700/20 border border-indigo-500/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] text-indigo-400 font-medium">关联摄像头</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1">
                    {linkedCamera.camera_name || `摄像头 ${linkedCamera.camera_device_id.slice(-6)}`}
                  </div>
                  {linkedCamera.preset_no > 0 && (
                    <div className="text-[10px] text-slate-500">预置位: {linkedCamera.preset_no}</div>
                  )}
                  {linkedCamera.stream_url ? (
                    <video
                      src={linkedCamera.stream_url}
                      autoPlay muted controls
                      className="w-full h-32 rounded bg-black mt-2 object-contain"
                    />
                  ) : (
                    <div className="w-full h-24 rounded bg-slate-900 flex flex-col items-center justify-center gap-1 px-2 text-center mt-2">
                      <span className="text-[10px] text-slate-500">暂无视频流</span>
                      <span className="text-[9px] text-slate-600 leading-snug">请确认摄像头在线、取流地址已配置，或检查 GB28181 / 平台视频服务状态。</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1" />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] border-slate-600 text-slate-300"
                onClick={() => navigate(`/device/archive?deviceId=${encodeURIComponent(selectedDevice.device_id)}`)}>
                <Eye className="w-3 h-3 mr-1" />查看档案
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => onDeletePosition(selectedDevice.position_id)}>
                <Trash2 className="w-3 h-3 mr-1" />删除点位
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
