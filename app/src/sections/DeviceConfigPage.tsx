import { useState } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { deviceConfigService } from '@/api/services';
import { Settings, Server } from 'lucide-react';

const typeMap: Record<string, string> = {
  detector: '烟感', button: '手报', pump: '消防泵', fan: '风机',
  sensor: '传感器', monitor: '监控器', controller: '控制器',
  alarm: '报警器', host: '报警主机', elevator: '电梯', broadcast: '广播',
  camera: '摄像头', 'gb28181-camera': 'GB28181摄像头',
  'fire-controller': '火灾报警控制器', water: '水源监测',
  electrical: '电气火灾', 'smoke-exhaust': '防排烟', lighting: '应急照明',
  'iot-sensor': 'IoT传感器', 'elec-monitor': '电气监测',
};

const protocolMap: Record<string, string> = {
  gb26875: 'GB26875', modbus: 'Modbus', modbustcp: 'ModbusTCP',
  mqtt: 'MQTT', nbiot: 'NB-IoT', gb28181: 'GB28181', tcp: 'TCP',
};

const COLUMNS = [
  { key: 'device_code', label: '设备编码', width: '120px' },
  { key: 'device_name', label: '设备名称', width: '160px' },
  { key: 'category', label: '设备类别', width: '100px', render: (v: unknown) => typeMap[String(v)] || String(v) },
  { key: 'protocol_type', label: '协议类型', width: '100px', render: (v: unknown) => protocolMap[String(v)] || String(v) || '-' },
  { key: 'heartbeat_interval', label: '心跳间隔(s)', width: '90px' },
  { key: 'remote_control_enabled', label: '远程控制', width: '80px', render: (v: unknown) =>
    v ? <span className="text-[10px] text-emerald-400">已启用</span> : <span className="text-[10px] text-slate-500">未启用</span>
  },
  { key: 'device_status', label: '设备状态', width: '80px', render: (v: unknown) =>
    v === 'normal' ? <span className="text-[10px] text-emerald-400">正常</span> : <span className="text-[10px] text-slate-500">{String(v)}</span>
  },
];

const FIELDS = [
  { key: 'device_id', label: '设备ID', type: 'text' as const, required: true },
  { key: 'protocol_type', label: '协议类型', type: 'select' as const, options: [
    { label: 'GB26875', value: 'gb26875' },
    { label: 'Modbus', value: 'modbus' },
    { label: 'ModbusTCP', value: 'modbustcp' },
    { label: 'MQTT', value: 'mqtt' },
    { label: 'NB-IoT', value: 'nbiot' },
    { label: 'GB28181', value: 'gb28181' },
    { label: 'TCP', value: 'tcp' },
  ]},
  { key: 'heartbeat_interval', label: '心跳间隔(秒)', type: 'number' as const },
  { key: 'data_collection_interval', label: '数据采集间隔(秒)', type: 'number' as const },
  { key: 'auto_report', label: '自动上报', type: 'select' as const, options: [
    { label: '是', value: '1' },
    { label: '否', value: '0' },
  ]},
  { key: 'mute_enabled', label: '允许消音', type: 'select' as const, options: [
    { label: '是', value: '1' },
    { label: '否', value: '0' },
  ]},
  { key: 'reset_enabled', label: '允许复位', type: 'select' as const, options: [
    { label: '是', value: '1' },
    { label: '否', value: '0' },
  ]},
  { key: 'remote_control_enabled', label: '允许远程控制', type: 'select' as const, options: [
    { label: '是', value: '1' },
    { label: '否', value: '0' },
  ]},
];

const FILTER_FIELDS = [
  {
    key: 'protocol_type',
    label: '协议类型',
    options: [
      { label: 'GB26875', value: 'gb26875' },
      { label: 'Modbus', value: 'modbus' },
      { label: 'MQTT', value: 'mqtt' },
      { label: 'GB28181', value: 'gb28181' },
    ],
  },
];

export default function DeviceConfigPage() {
  const [configModal, setConfigModal] = useState<{ deviceId: string; deviceName: string } | null>(null);

  return (
    <>
      <PageTemplate
        title="设备配置"
        icon={Settings}
        columns={COLUMNS}
        service={deviceConfigService as any}
        fields={FIELDS}
        filterFields={FILTER_FIELDS}
        renderExtraActions={(row) => (
          <button
            onClick={() => setConfigModal({ deviceId: String(row.device_id), deviceName: String(row.device_name) })}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-[10px] transition-colors"
            title="编辑配置"
          >
            <Server className="w-3 h-3" />配置
          </button>
        )}
      />
      {configModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setConfigModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-slate-200 mb-3">设备配置详情 - {configModal.deviceName}</h3>
            <p className="text-xs text-slate-500">设备ID: {configModal.deviceId}</p>
            <p className="text-xs text-slate-500 mt-1">（后续可扩展为完整的配置编辑器）</p>
            <div className="flex justify-end mt-4">
              <button onClick={() => setConfigModal(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg">关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
