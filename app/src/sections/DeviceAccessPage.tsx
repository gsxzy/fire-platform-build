import { useNavigate, Link } from 'react-router';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { useToast } from '@/core/ToastContext';

import TableBodyPlaceholder from '@/components/TableBodyPlaceholder';
import {
  Wifi, WifiOff, Search, CheckCircle,
  AlertTriangle, Radio, Shield, Globe, FileText,
  Database, Plus, Server,
  RefreshCw, Cpu, Layers,
} from 'lucide-react';


import {
  getCategoryConfig, statusConfig, protocolColor,
  formatHeartbeat, iotDeviceToAddForm,
  BRAND_COMPAT_ROWS,
} from './deviceAccess/utils';


import { useDeviceAccess } from './deviceAccess/hooks';
import AccessModal from './deviceAccess/components/AccessModal';
import DeviceDetailPanel from './deviceAccess/components/DeviceDetailPanel';

export default function DeviceAccessPage() {
  const navigate = useNavigate();
  useToast();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const da = useDeviceAccess();

  const statCards = [
    { label: '接入设备', value: da.stats.total, unit: '台', Icon: Cpu, iconClass: 'text-blue-400' },
    { label: '在线', value: da.stats.online, unit: '台', Icon: Wifi, iconClass: 'text-emerald-400' },
    { label: '离线', value: da.stats.offline, unit: '台', Icon: WifiOff, iconClass: 'text-slate-400' },
    { label: '故障', value: da.stats.fault, unit: '台', Icon: AlertTriangle, iconClass: 'text-red-400' },
    { label: '预警', value: da.stats.warning, unit: '台', Icon: Shield, iconClass: 'text-yellow-400' },
    { label: '已绑定', value: da.stats.bound, unit: '台', Icon: CheckCircle, iconClass: 'text-purple-400' },
    { label: '采集点位', value: da.stats.totalPoints, unit: '个', Icon: Database, iconClass: 'text-cyan-400' },
  ];

  return (
    <div className="p-4 space-y-4">
      <DeviceManagementFlowHint active="access" />
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备接入</h2>
            <p className="text-[10px] text-slate-500 max-w-xl">
              仅允许选择已在「入库管理」<span className="text-slate-400">提交入库（已入库）</span>的设备，配置
              <span className="text-slate-400">协议 / IP / 端口 / 连通性</span>；单位绑定请在「设备分配」完成，业务阈值与联动请在「设备配置」维护。
            </p>
            <div className="mt-2">
              <Link to="/device/access/ctwing" className="inline-block text-[10px] px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 transition-colors">
                打开 CTWing 海康4G 专用配置页
              </Link>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400">{da.stats.online} 在线</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/30 rounded border border-slate-600/20">
            <WifiOff className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">{da.stats.offline} 离线</span>
          </div>
          {da.lastSyncAt && (
            <span className="text-[9px] text-slate-600">
              同步于 {da.lastSyncAt.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => da.loadDevices()}
            disabled={da.listLoading}
            className="h-7 px-2.5 text-[10px] rounded-md bg-slate-700/30 border border-slate-600/20 text-slate-300 hover:bg-slate-700/50 flex items-center gap-1 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${da.listLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => { da.setAddForm(da.initialAddForm); da.setEditingDbId(null); da.setShowAddModal(true); }}
            className="h-7 px-3 text-[10px] rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />新增接入
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass rounded-xl p-3 flex items-center gap-2.5 animate-fade-in-up">
            <div className={`w-8 h-8 rounded-lg bg-slate-700/30 flex items-center justify-center ${s.iconClass}`}>
              <s.Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100 leading-none">{s.value}</div>
              <div className="text-[9px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl px-4 py-3 flex flex-col sm:flex-row gap-3 animate-fade-in-up">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={da.search}
            onChange={(e) => da.setSearch(e.target.value)}
            placeholder="搜索设备名称 / SN / IP / 协议…"
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-800/50 border border-slate-700/30 rounded-md text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={da.catFilter} onChange={(e) => da.setCatFilter(e.target.value)} className="h-8 px-2.5 text-xs bg-slate-800/50 border border-slate-700/30 rounded-md text-slate-200 outline-none">
            <option value="all">全部分类</option>
            {Object.entries(getCategoryConfig('')).map(([k]) => (
              <option key={k} value={k}>{getCategoryConfig(k).label}</option>
            ))}
          </select>
          <select value={da.statusFilter} onChange={(e) => da.setStatusFilter(e.target.value)} className="h-8 px-2.5 text-xs bg-slate-800/50 border border-slate-700/30 rounded-md text-slate-200 outline-none">
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="fault">故障</option>
          </select>
          <select value={da.protocolFilter} onChange={(e) => da.setProtocolFilter(e.target.value)} className="h-8 px-2.5 text-xs bg-slate-800/50 border border-slate-700/30 rounded-md text-slate-200 outline-none">
            <option value="all">全部协议</option>
            <option value="Modbus TCP">Modbus TCP</option>
            <option value="Modbus RTU">Modbus RTU</option>
            <option value="MQTT">MQTT</option>
            <option value="HTTP">HTTP</option>
            <option value="CoAP">CoAP</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="FSCN8001">FSCN8001</option>
            <option value="GB26875">GB26875</option>
            <option value="HIKVISION">HIKVISION</option>
          </select>
        </div>
      </div>

      {/* Device Table */}
      <div className="glass rounded-xl overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700/30 bg-slate-800/30">
                <th className="px-4 py-2.5 text-slate-400 font-medium w-10">#</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">设备</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">分类</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">协议</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">状态</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">IP:Port</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">心跳</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">点位</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium">绑定</th>
                <th className="px-4 py-2.5 text-slate-400 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {da.listLoading ? (
                <TableBodyPlaceholder colSpan={10} loading />
              ) : da.devices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <Layers className="w-8 h-8 text-slate-600" />
                      <span>暂无 IoT 接入设备</span>
                      <span className="text-[10px] text-slate-600">请先确保设备已在「入库管理」中提交入库，再点击「新增接入」完成平台对接。</span>
                    </div>
                  </td>
                </tr>
              ) : (
                da.devices.map((device, idx) => {
                  const cfg = getCategoryConfig(device.category);
                  const st = statusConfig(device.status);
                  return (
                    <tr
                      key={device.dbId}
                      className={`border-b border-slate-700/20 transition-colors ${
                        da.selectedDevice?.dbId === device.dbId ? 'bg-blue-500/5' : 'hover:bg-slate-700/10'
                      }`}
                      onClick={() => da.setSelectedDevice(device)}
                    >
                      <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                          <div>
                            <div className="text-slate-200 font-medium text-[11px]">{device.name}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{device.deviceSn || device.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-300">{cfg.label}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${protocolColor(device.protocol)}`}>{device.protocol}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          <span className={`text-[10px] ${st.color}`}>{st.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 font-mono text-[10px]">{device.ip ? `${device.ip}:${device.port}` : '—'}</td>
                      <td className="px-4 py-2.5 text-[10px] text-slate-400">{formatHeartbeat(device.lastHeartbeat)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] text-slate-300">{device.dataPoints} 个</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {device.isBound ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">已绑定</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-500">未绑定</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/device/config?keyword=${encodeURIComponent(device.deviceSn || device.id)}`); }}
                          className="text-[10px] px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                        >
                          配置
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {da.selectedDevice && (
        <DeviceDetailPanel
          device={da.selectedDevice}
          onEdit={() => {
            da.setAddForm(iotDeviceToAddForm(da.selectedDevice!));
            da.setEditingDbId(da.selectedDevice!.dbId);
            da.setShowAddModal(true);
          }}
          onDelete={() => da.deleteAccess(da.selectedDevice!)}
          onClose={() => da.setSelectedDevice(null)}
        />
      )}

      {/* Brand Compat Info */}
      <div className="glass rounded-xl p-4 animate-fade-in-up">
        <h3 className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          品牌协议兼容矩阵
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BRAND_COMPAT_ROWS.map((row) => (
            <div key={row.brand} className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-200">{row.brand}</span>
                <span className="text-[9px] text-slate-500">{row.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Access Modal */}
      <AccessModal
        show={da.showAddModal}
        onClose={() => { da.setShowAddModal(false); da.setEditingDbId(null); }}
        editingDbId={da.editingDbId}
        addForm={da.addForm}
        onFormChange={da.setAddForm}
        archiveDevices={da.archiveDevices}
        devices={da.devices}
        onSubmit={da.submitAccess}
      />
    </div>
  );
}
