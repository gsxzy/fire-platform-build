import { X } from 'lucide-react';
import type { IoTDevice } from '../types';
import { getCategoryConfig, protocolColor, showCtwingFields } from '../utils';

interface DeviceDetailPanelProps {
  device: IoTDevice;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function DeviceDetailPanel({ device, onEdit, onDelete, onClose }: DeviceDetailPanelProps) {
  const cc = getCategoryConfig(device.category);
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <cc.icon className={`w-5 h-5 shrink-0 ${cc.color}`} />
          <span className="text-sm font-bold text-slate-200 truncate">{device.name}</span>
          <span className="text-[9px] text-slate-500 font-mono shrink-0" title={`内部ID ${device.dbId}`}>{device.deviceSn || device.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit}
            className="text-[10px] px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25">
            编辑
          </button>
          <button type="button" onClick={onDelete}
            className="text-[10px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
            移除接入
          </button>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 text-[10px]">
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">档案编号</span><span className="text-slate-300 font-mono">{device.deviceNo || device.deviceSn || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">通信协议</span><span className={`${protocolColor(device.protocol)} px-1.5 py-0.5 rounded text-[9px]`}>{device.protocol}</span></div>
        {device.ip && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IP地址</span><span className="text-slate-300 font-mono">{device.ip}:{device.port}</span></div>}
        {device.imei && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IMEI</span><span className="text-slate-300 font-mono">{device.imei}</span></div>}
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">心跳间隔</span><span className="text-slate-300">{device.heartbeatInterval}s</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">固件版本</span><span className="text-slate-300">{device.firmware || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">厂商/型号</span><span className="text-slate-300">{device.manufacturer || '—'} {device.model || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">生产日期</span><span className="text-slate-300">{device.productionDate || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">安装日期</span><span className="text-slate-300">{device.installDate || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">质保期</span><span className="text-slate-300">{device.warrantyPeriod ? `${device.warrantyPeriod}个月` : '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">质保到期</span><span className="text-slate-300">{device.warrantyExpire || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">维保到期</span><span className="text-slate-300">{device.maintenanceExpire || '—'}</span></div>
        <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">绑定状态</span><span className={device.isBound ? 'text-emerald-400' : 'text-yellow-400'}>{device.isBound ? '已绑定台账' : '未绑定'}</span></div>
        {device.category && showCtwingFields(device.category, device.protocol) && (
          <>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">产品ID</span><span className="text-slate-300 font-mono">{device.protocolConfig?.productId || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">CTWing设备ID</span><span className="text-slate-300 font-mono">{device.protocolConfig?.ctwingDeviceId || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">MQTT Broker</span><span className="text-slate-300 font-mono">{device.protocolConfig?.broker || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">Keepalive</span><span className="text-slate-300">{device.protocolConfig?.keepalive || '—'}s</span></div>
          </>
        )}
      </div>
    </div>
  );
}
