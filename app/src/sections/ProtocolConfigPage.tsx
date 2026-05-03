import { useState } from 'react';
import {
  Cable, ChevronRight, CheckCircle, XCircle, Save,
  FileText, ToggleRight, ToggleLeft, Edit3,
  Server, Wifi, Globe, Lock, Cpu, RefreshCw
} from 'lucide-react';

/* ═══════ Types ═══════ */
interface ProtocolProfile {
  id: string;
  name: string;
  type: 'modbus-tcp' | 'modbus-rtu' | 'mqtt' | 'tcp-transparent' | 'gb26875' | 'private';
  enabled: boolean;
  description: string;
  config: Record<string, string>;
  deviceCount: number;
  parseSuccess: number;
  parseFail: number;
  lastUpdate: string;
}

/* ═══════ Mock Data ═══════ */
const protocolProfiles: ProtocolProfile[] = [
  {
    id: 'PROT-001', name: '赋安主机-Modbus TCP', type: 'modbus-tcp', enabled: true,
    description: '适配赋安FS5116系列火灾报警控制器，支持寄存器0x0001-0x2000全量点位映射',
    config: { slaveId: '1', registerStart: '0x0001', registerEnd: '0x2000', endian: '大端', pollInterval: '1000ms', timeout: '3000ms', retry: '3', serverPort: '502' },
    deviceCount: 4, parseSuccess: 2458901, parseFail: 12, lastUpdate: '2026-04-19 10:05:32',
  },
  {
    id: 'PROT-002', name: '海湾主机-TCP透传', type: 'tcp-transparent', enabled: true,
    description: '适配海湾GST5000/GST5000H系列火灾报警控制器私有协议',
    config: { frameHeader: '0xAA55', heartbeatInterval: '30s', maxFrameSize: '2048', reconnectDelay: '5s', heartbeatFrame: '0xAA550100', verifyMode: 'CRC16' },
    deviceCount: 2, parseSuccess: 1890234, parseFail: 8, lastUpdate: '2026-04-19 10:05:28',
  },
  {
    id: 'PROT-003', name: 'NB-IoT设备-MQTT', type: 'mqtt', enabled: true,
    description: '适配赋安NB烟感/温感/复合探测器，支持QoS1消息质量',
    config: { broker: 'mqtt.xzyfire.com:1883', qos: '1', keepAlive: '60s', topicPrefix: 'device/nb/', clientCert: '已配置', willTopic: 'device/nb/will' },
    deviceCount: 6, parseSuccess: 890123, parseFail: 23, lastUpdate: '2026-04-19 10:05:15',
  },
  {
    id: 'PROT-004', name: '工业传感器-Modbus RTU', type: 'modbus-rtu', enabled: true,
    description: '适配管网压力/液位/温度传感器，RS485串口转TCP网关',
    config: { baudRate: '9600', dataBits: '8', parity: 'None', stopBits: '1', slaveId: '1-8', pollInterval: '5000ms', gatewayIp: '192.168.1.250' },
    deviceCount: 8, parseSuccess: 1567890, parseFail: 45, lastUpdate: '2026-04-19 10:05:30',
  },
  {
    id: 'PROT-005', name: '泰和安主机-私有协议', type: 'private', enabled: true,
    description: '适配泰和安TX3000/TX3016A系列火灾报警控制器私有通信协议',
    config: { protocolVer: 'V3.2', authKey: '已配置', encrypt: 'AES-128', sessionTimeout: '300s', heartbeatFrame: '0xFE01', ackMode: '自动应答' },
    deviceCount: 2, parseSuccess: 678901, parseFail: 5, lastUpdate: '2026-04-19 10:05:25',
  },
  {
    id: 'PROT-006', name: '赋安FSCN8001-GB26875', type: 'gb26875', enabled: true,
    description: '适配赋安FSCN8001用户信息传输装置，支持GB/T 26875.1-2011城市消防远程监控协议，接入赋安FS5116火灾报警控制器',
    config: { serverIp: '124.223.35.58', serverPort: '5200', heartbeatInterval: '30s', reconnectDelay: '10s', verifyMode: 'MD5', protocolVer: 'GB/T 26875.1-2011', buildingId: '3402000001', maxRetries: '3' },
    deviceCount: 2, parseSuccess: 345678, parseFail: 2, lastUpdate: '2026-04-19 10:05:35',
  },
];

/* ═══════ Helpers ═══════ */
const typeConfig = (type: string) => {
  switch (type) {
    case 'modbus-tcp': return { label: 'Modbus TCP', icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'modbus-rtu': return { label: 'Modbus RTU', icon: Cable, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
    case 'mqtt': return { label: 'MQTT', icon: Wifi, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    case 'tcp-transparent': return { label: 'TCP透传', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    case 'gb26875': return { label: 'GB26875', icon: Server, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    case 'private': return { label: '私有协议', icon: Lock, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    default: return { label: type, icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  }
};

/* ═══════ Main ═══════ */
export default function ProtocolConfigPage() {
  const [profiles, setProfiles] = useState(protocolProfiles);
  const [selected, setSelected] = useState<ProtocolProfile | null>(protocolProfiles[0]);
  const [search, setSearch] = useState('');

  const toggleEnable = (id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const filtered = profiles.filter(p => !search || p.name.includes(search) || p.type.includes(search));
  const totalSuccess = profiles.reduce((s: any, p: any) => s + p.parseSuccess, 0);
  const totalFail = profiles.reduce((s: any, p: any) => s + p.parseFail, 0);
  const totalDevices = profiles.reduce((s: any, p: any) => s + p.deviceCount, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Cable className="w-4 h-4 text-blue-400" />
        <span>IoT接入层</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">协议解析配置</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '协议配置', value: profiles.length, icon: FileText, color: 'blue' },
          { label: '已启用', value: profiles.filter(p => p.enabled).length, icon: CheckCircle, color: 'emerald' },
          { label: '接入设备', value: totalDevices, icon: Cpu, color: 'purple' },
          { label: '解析成功', value: (totalSuccess / 1000000).toFixed(2) + 'M', icon: CheckCircle, color: 'green' },
          { label: '解析失败', value: totalFail, icon: XCircle, color: 'red' },
        ].map((s: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-400">{s.label}</span><s.icon className={`w-4 h-4 text-${s.color}-400`} /></div>
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Left: Protocol List */}
        <div className="w-80 flex-shrink-0 space-y-2">
          <div className="relative mb-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索协议配置..." className="w-full bg-slate-700/30 border border-slate-600/30 rounded pl-7 pr-2 py-1.5 text-[10px] text-slate-200 outline-none" />
          </div>
          {filtered.map(p => {
            const tc = typeConfig(p.type);
            return (
              <div key={p.id} onClick={() => setSelected(p)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === p.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-700/30 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <tc.icon className={`w-3.5 h-3.5 ${tc.color}`} />
                    <span className="text-[11px] text-slate-200 font-medium">{p.name}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleEnable(p.id); }} aria-label="切换">{p.enabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-600" />}</button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8px] px-1 py-0.5 rounded ${tc.bg} ${tc.color}`}>{tc.label}</span>
                  <span className="text-[8px] text-slate-500">{p.deviceCount}台设备</span>
                  <span className="text-[8px] text-emerald-400">{(p.parseSuccess / 10000).toFixed(0)}万条</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Config Detail */}
        <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => { const tc = typeConfig(selected.type); return <tc.icon className={`w-5 h-5 ${tc.color}`} />; })()}
                  <span className="text-sm font-bold text-slate-200">{selected.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{selected.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"><Edit3 className="w-3 h-3" />编辑</button>
                  <button className="text-[10px] px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors flex items-center gap-1"><Save className="w-3 h-3" />保存</button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-4">{selected.description}</p>

              {/* Parse Stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-emerald-400">{((selected.parseSuccess / (selected.parseSuccess + selected.parseFail)) * 100).toFixed(3)}%</div>
                  <div className="text-[9px] text-slate-500">解析成功率</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-slate-200">{selected.parseSuccess.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-500">成功条数</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-red-400">{selected.parseFail}</div>
                  <div className="text-[9px] text-slate-500">失败条数</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-blue-400">{selected.deviceCount}</div>
                  <div className="text-[9px] text-slate-500">接入设备</div>
                </div>
              </div>

              {/* Config Table */}
              <div className="mb-2 text-[11px] text-slate-300 font-medium">协议参数配置</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selected.config).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 p-2 bg-slate-700/20 rounded">
                    <span className="text-[10px] text-slate-500 w-28 flex-shrink-0">{k}</span>
                    <span className="text-[10px] text-slate-200 font-mono">{v}</span>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="mt-4 p-2.5 bg-slate-700/20 rounded flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-slate-400">最后更新: <span className="text-slate-300 font-mono">{selected.lastUpdate}</span></span>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500 text-sm">选择左侧协议配置查看详情</div>
          )}
        </div>
      </div>
    </div>
  );
}
