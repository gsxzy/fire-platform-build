import { Phone, Building2, MapPin, ChevronRight } from 'lucide-react';

interface InfoGridProps {
  detail: any;
  unitName: string;
  statusInfo: { label: string; color: string };
  typeInfo: { label: string; icon: React.ElementType };
  alarmTime: string;
  location: string;
  controlRoom: any;
  dutyPhone: string;
  crManager: string;
  crManagerPhone: string;
  onCall: (phone: string) => void;
}

export default function InfoGrid({
  detail, unitName, statusInfo, typeInfo, alarmTime, location,
  controlRoom, dutyPhone, crManager, crManagerPhone, onCall,
}: InfoGridProps) {
  const TypeIcon = typeInfo.icon;
  return (
    <div className="rounded-lg border border-slate-700/30 overflow-hidden">
      {/* Row 1: 报警单位 + 处理状态 */}
      <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警单位</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 font-medium flex items-center">{unitName}</div>
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">处理状态</div>
        <div className="px-3 py-2 text-[11px] flex items-center">
          <span className={`${statusInfo.color} font-medium`}>{statusInfo.label}</span>
        </div>
      </div>
      {/* Row 2: 报警时间 + 报警类型 */}
      <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警时间</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center">{alarmTime}</div>
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警类型</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
          <TypeIcon className="w-3.5 h-3.5" />
          <span>{typeInfo.label}</span>
          <ChevronRight className="w-3 h-3 text-blue-400" />
        </div>
      </div>
      {/* Row 3: 报警位置 */}
      <div className="grid grid-cols-[100px_1fr] border-b border-slate-700/30">
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警位置</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-400" />{location}
        </div>
      </div>
      {/* Row 4: 消控室 + 值班电话 */}
      <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">
          {controlRoom?.room_name || '未配置消控室'}
        </div>
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">值班电话</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
          {dutyPhone !== '-' ? (
            <button onClick={() => onCall(dutyPhone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
              <Phone className="w-3 h-3" />{dutyPhone}
            </button>
          ) : '-'}
        </div>
      </div>
      {/* Row 5: 消控室负责人 + 手机号 */}
      <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室负责人</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center justify-between">
          <span>{crManager}</span>
          {crManagerPhone !== '-' && (
            <button onClick={() => onCall(crManagerPhone)} className="text-emerald-400 hover:text-emerald-300" aria-label="拨打">
              <Phone className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">手机号</div>
        <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
          {crManagerPhone !== '-' ? (
            <button onClick={() => onCall(crManagerPhone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
              <Phone className="w-3 h-3" />{crManagerPhone}
            </button>
          ) : '-'}
        </div>
      </div>
      {/* Row 6-7: more contacts if available */}
      {detail.unit?.contact_name && (
        <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
          <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">单位联系人</div>
          <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">{detail.unit.contact_name}</div>
          <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">联系电话</div>
          <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
            {detail.unit.contact_phone ? (
              <button onClick={() => onCall(detail.unit.contact_phone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                <Phone className="w-3 h-3" />{detail.unit.contact_phone}
              </button>
            ) : '-'}
          </div>
        </div>
      )}
      {detail.unit?.address && (
        <div className="grid grid-cols-[100px_1fr]">
          <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">单位地址</div>
          <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-500" />{detail.unit.address}
          </div>
        </div>
      )}
    </div>
  );
}
