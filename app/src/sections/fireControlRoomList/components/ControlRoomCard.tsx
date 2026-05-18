import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare, Square, Edit3, Trash2,
  Server, Cpu, CircuitBoard, Grid3X3, Zap, Activity,
  FileText, Table2,
} from 'lucide-react';
import type { ControlRoom } from '../types';

export default function ControlRoomCard({
  room,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  room: ControlRoom;
  selected: boolean;
  onSelect: () => void;
  onEdit: (room: ControlRoom) => void;
  onDelete: (room: ControlRoom) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/monitor/control/room/${room.id}`)}
      className={`border cursor-pointer group relative overflow-hidden backdrop-blur-sm transition-all hover:scale-[1.01] ${
        selected
          ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-xl'
          : 'border-slate-700/30 bg-slate-800/40 hover:bg-slate-700/40 rounded-xl'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${room.online ? 'bg-emerald-500/60' : 'bg-slate-600/40'}`} />

      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30">
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button onClick={onSelect} className="text-slate-500 hover:text-blue-400 transition-colors">
              {selected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
            </button>
            {room.online ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] text-emerald-400 font-medium">在线</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-[10px] text-slate-500 font-medium">离线</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => navigate(`/monitor/control/host-code?roomId=${room.id}`)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-medium"
              title="报警主机编码表"
            >
              <Table2 className="w-3 h-3" />编码表
            </button>
            <button onClick={() => onEdit(room)} className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-all" title="编辑">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(room)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all" title="删除" aria-label="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-start gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${room.online ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-slate-700/20 ring-1 ring-slate-700/40'}`}>
              <Server className={`w-5 h-5 ${room.online ? 'text-emerald-400' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-slate-100 truncate">{room.projectName || room.unitName}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{room.unitName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] bg-blue-500/8 text-blue-400 border-blue-500/20 font-medium">
                  <Cpu className="w-2.5 h-2.5 mr-1" />{room.controllerModel || 'JB-3208G'}
                </Badge>
                <span className="text-[10px] text-slate-500 font-mono">{room.hostNo}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-blue-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-blue-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-blue-500/15">
                <CircuitBoard className="w-2.5 h-2.5 text-blue-400" />
              </div>
              <div className="text-xs font-bold text-blue-400">{room.busDevices}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">总线设备</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-emerald-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-emerald-500/15">
                <Grid3X3 className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-emerald-400">{room.busPoints}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">设备点位</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-amber-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-amber-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-amber-500/15">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <div className="text-xs font-bold text-amber-400">{room.multilineDevices}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">多线设备</div>
            </div>
            <div className="text-center p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-cyan-500/20 transition-colors">
              <div className="w-4 h-4 rounded-md bg-cyan-500/10 flex items-center justify-center mx-auto mb-0.5 ring-1 ring-cyan-500/15">
                <Activity className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-cyan-400">{room.multilinePoints}</div>
              <div className="text-[8px] text-slate-500 mt-0.5">多线点位</div>
            </div>
          </div>

          {room.serviceStart && room.serviceEnd && (
            <div className="mt-2 pt-1.5 border-t border-slate-700/30 flex items-center justify-center gap-1.5">
              <FileText className="w-2.5 h-2.5 text-slate-600" />
              <span className="text-[10px] text-slate-500">
                服务期 <span className="text-slate-400">{room.serviceStart}</span> <span className="text-slate-600">~</span> <span className="text-slate-400">{room.serviceEnd}</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
