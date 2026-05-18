import { useMemo } from 'react';
import { X, Cable, ChevronRight, Save } from 'lucide-react';
import type { Device } from '@/types/db';
import type { IoTDevice } from '../types';
import type { AddFormState } from '../hooks';
import {
  categoryConfig, isHikvisionCategory, showCtwingFields,
  PROTOCOL_OPTIONS,
} from '../utils';

interface ArchiveDevice extends Device {
  archiveId: string;
  gatewayId: string;
}

interface AccessModalProps {
  show: boolean;
  onClose: () => void;
  editingDbId: string | null;
  addForm: AddFormState;
  onFormChange: (form: AddFormState) => void;
  archiveDevices: ArchiveDevice[];
  devices: IoTDevice[];
  onSubmit: () => void;
}

export default function AccessModal({
  show, onClose, editingDbId, addForm, onFormChange,
  archiveDevices, devices, onSubmit,
}: AccessModalProps) {
  if (!show) return null;

  const handleDeviceSelect = (archiveId: string) => {
    const d = archiveDevices.find((x) => x.archiveId === archiveId);
    if (!d) return;
    const isTx = d.type === 'user-transmission-device';
    const isHost = d.type === 'fire-controller' || d.type === 'host';
    const hostCandidates = archiveDevices.filter((x) => (x.type === 'fire-controller' || x.type === 'host') && x.archiveId !== d.archiveId);
    const txCandidates = archiveDevices.filter((x) => x.type === 'user-transmission-device' && x.archiveId !== d.archiveId);

    let autoHostId = '', autoHostSn = '', autoTxId = '', autoTxSn = '';
    if (isTx) {
      const matchedHost = hostCandidates.find((h: any) => h.gatewayId === d.deviceNo || h.gatewayId === d.id);
      if (matchedHost) { autoHostId = matchedHost.archiveId; autoHostSn = matchedHost.deviceNo || matchedHost.id; }
    } else if (isHost) {
      const matchedTx = txCandidates.find((t: any) => t.deviceNo === (d as any).gatewayId || t.id === (d as any).gatewayId);
      if (matchedTx) { autoTxId = matchedTx.archiveId; autoTxSn = matchedTx.deviceNo || matchedTx.id; }
    }

    onFormChange({
      ...addForm,
      archiveDeviceId: d.archiveId,
      deviceName: d.name,
      unitId: d.unitId || '',
      unitName: d.unitName || '',
      category: (d.type || 'fire-controller') as any,
      manufacturer: d.manufacturer || '',
      model: d.model || '',
      firmware: d.firmware || '',
      productionDate: d.productionDate || '',
      installDate: d.installDate || '',
      warrantyPeriod: String(d.warrantyPeriod || ''),
      warrantyExpire: d.warrantyExpire || '',
      maintenanceExpire: d.maintenanceExpire || '',
      hostDeviceId: autoHostId,
      hostDeviceSn: autoHostSn,
      txDeviceId: autoTxId,
      txDeviceSn: autoTxSn,
    });
  };

  const filteredArchive = useMemo(() =>
    archiveDevices.filter((d) => d.type !== 'gb28181-camera'),
    [archiveDevices]
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Cable className="w-4 h-4 text-blue-400" />
            {editingDbId ? '编辑接入配置' : '从档案接入平台'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
            <span className="text-blue-400 font-medium">Step 1: 选择设备</span>
            <ChevronRight className="w-3 h-3" />
            <span>Step 2: 配置通信</span>
            <ChevronRight className="w-3 h-3" />
            <span>Step 3: 确认接入</span>
          </div>

          {/* Device Selection */}
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">从设备档案选择 <span className="text-red-400">*</span></label>
            <select
              value={addForm.archiveDeviceId}
              disabled={!!editingDbId}
              onChange={(e) => handleDeviceSelect(e.target.value)}
              className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none disabled:opacity-50"
            >
              <option value="">请选择设备（已入库/已接入/已分配均可配置）</option>
              {filteredArchive.map((d) => {
                const alreadyConnected = devices.some((dev) => dev.archiveDeviceId && dev.archiveDeviceId === d.archiveId);
                return (
                  <option key={d.archiveId} value={d.archiveId}>
                    {d.deviceNo || d.archiveId} · {d.name} {alreadyConnected ? '（已接入，编辑配置）' : d.location ? `· ${d.location}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备分类 <span className="text-red-400">*</span></label>
              <select value={addForm.category} onChange={e => {
                const cat = e.target.value;
                onFormChange({ ...addForm, category: cat, protocol: isHikvisionCategory(cat) ? 'MQTT' : addForm.protocol });
              }} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{(v as any).label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">通信协议 <span className="text-red-400">*</span></label>
              <select value={addForm.protocol} onChange={e => onFormChange({ ...addForm, protocol: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                {PROTOCOL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* FSCN8001 关联配置 */}
          {(addForm.category === 'user-transmission-device') && (
            <div className="space-y-3 border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-amber-400">赋安 FSCN8001 关联配置</span>
                <span className="text-[9px] text-slate-500">选择该传输装置服务的报警主机</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">关联报警主机 <span className="text-amber-400">（可选）</span></label>
                <select
                  value={addForm.hostDeviceId}
                  onChange={(e) => {
                    const host = archiveDevices.find((x) => x.archiveId === e.target.value);
                    onFormChange({ ...addForm, hostDeviceId: e.target.value, hostDeviceSn: host?.deviceNo || host?.id || '' });
                  }}
                  className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="">不关联主机（仅作为独立传输装置接入）</option>
                  {archiveDevices.filter((d) => (d.type === 'fire-controller' || d.type === 'host') && d.archiveId !== addForm.archiveDeviceId).map((d) => (
                    <option key={d.archiveId} value={d.archiveId}>
                      {d.deviceNo || d.archiveId} · {d.name} {d.location ? `· ${d.location}` : ''}
                    </option>
                  ))}
                </select>
                {addForm.hostDeviceId && addForm.hostDeviceSn && (
                  <p className="text-[9px] text-amber-300 mt-1">接入后将自动更新主机档案「关联网关(SN)」为：{addForm.hostDeviceSn}</p>
                )}
              </div>
            </div>
          )}
          {(addForm.category === 'fire-controller' || addForm.category === 'host') && (
            <div className="space-y-3 border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-amber-400">赋安 FSCN8001 关联配置</span>
                <span className="text-[9px] text-slate-500">选择服务该主机的传输装置</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">关联传输装置 <span className="text-amber-400">（可选）</span></label>
                <select
                  value={addForm.txDeviceId}
                  onChange={(e) => {
                    const tx = archiveDevices.find((x) => x.archiveId === e.target.value);
                    onFormChange({ ...addForm, txDeviceId: e.target.value, txDeviceSn: tx?.deviceNo || tx?.id || '' });
                  }}
                  className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="">不关联传输装置（主机独立接入）</option>
                  {archiveDevices.filter((d) => d.type === 'user-transmission-device' && d.archiveId !== addForm.archiveDeviceId).map((d) => (
                    <option key={d.archiveId} value={d.archiveId}>
                      {d.deviceNo || d.archiveId} · {d.name} {d.location ? `· ${d.location}` : ''}
                    </option>
                  ))}
                </select>
                {addForm.txDeviceId && addForm.txDeviceSn && (
                  <p className="text-[9px] text-amber-300 mt-1">接入后将自动更新主机档案「关联网关(SN)」为：{addForm.txDeviceSn}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">IP地址</label>
              <input value={addForm.ip} onChange={e => onFormChange({ ...addForm, ip: e.target.value })} placeholder="192.168.1.xxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">端口</label>
              <input value={addForm.port} onChange={e => onFormChange({ ...addForm, port: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">IMEI (NB设备)</label>
              <input value={addForm.imei} onChange={e => onFormChange({ ...addForm, imei: e.target.value })} placeholder="866xxxxxxxxxxxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">心跳间隔(秒)</label>
              <input type="number" value={addForm.heartbeatInterval} onChange={e => onFormChange({ ...addForm, heartbeatInterval: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>

          {/* CTWing MQTT */}
          {showCtwingFields(addForm.category, addForm.protocol) && (
            <div className="space-y-3 border border-cyan-500/20 rounded-lg p-3 bg-cyan-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-cyan-400">CTWing MQTT 接入配置</span>
                <span className="text-[9px] text-slate-500">海康4G设备必填</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">产品ID <span className="text-red-400">*</span></label>
                  <input value={addForm.productId} onChange={e => onFormChange({ ...addForm, productId: e.target.value })} placeholder="2000614607" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">CTWing设备ID <span className="text-red-400">*</span></label>
                  <input value={addForm.ctwingDeviceId} onChange={e => onFormChange({ ...addForm, ctwingDeviceId: e.target.value })} placeholder="99013914869646085145332" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">特征串/密码 <span className="text-red-400">*</span></label>
                  <input value={addForm.ctwingPassword} onChange={e => onFormChange({ ...addForm, ctwingPassword: e.target.value })} placeholder="pnnbCufLrnsd4zMs3qbozmQ4gD90e5JIzbSA3cNfc8M" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">MQTT Broker <span className="text-red-400">*</span></label>
                  <input value={addForm.broker} onChange={e => onFormChange({ ...addForm, broker: e.target.value })} placeholder="2000614607.non-nb.ctwing.cn" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Keepalive(秒)</label>
                  <input type="number" value={addForm.keepalive} onChange={e => onFormChange({ ...addForm, keepalive: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">告警阈值JSON</label>
                  <input value={addForm.thresholds} onChange={e => onFormChange({ ...addForm, thresholds: e.target.value })} placeholder='{"smoke":1,"voltage":3.0}' className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">楼层</label>
              <input value={addForm.floor} onChange={e => onFormChange({ ...addForm, floor: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">房间</label>
              <input value={addForm.room} onChange={e => onFormChange({ ...addForm, room: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">寄存器数量</label>
              <input type="number" value={addForm.registerCount} onChange={e => onFormChange({ ...addForm, registerCount: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">厂商</label>
              <input value={addForm.manufacturer} onChange={e => onFormChange({ ...addForm, manufacturer: e.target.value })} placeholder="赋安/海湾/泰和安" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">型号</label>
              <input value={addForm.model} onChange={e => onFormChange({ ...addForm, model: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">固件版本</label>
              <input value={addForm.firmware} onChange={e => onFormChange({ ...addForm, firmware: e.target.value })} placeholder="V1.0.0" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">生产日期</label>
              <input type="date" value={addForm.productionDate} onChange={e => onFormChange({ ...addForm, productionDate: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">安装日期</label>
              <input type="date" value={addForm.installDate} onChange={e => onFormChange({ ...addForm, installDate: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">质保期(月)</label>
              <input type="number" value={addForm.warrantyPeriod} onChange={e => onFormChange({ ...addForm, warrantyPeriod: e.target.value })} placeholder="12" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">质保到期日</label>
              <input type="date" value={addForm.warrantyExpire} onChange={e => onFormChange({ ...addForm, warrantyExpire: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">维保到期日</label>
              <input type="date" value={addForm.maintenanceExpire} onChange={e => onFormChange({ ...addForm, maintenanceExpire: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!addForm.archiveDeviceId}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />{editingDbId ? '保存修改' : '确认接入'}
          </button>
        </div>
      </div>
    </div>
  );
}
