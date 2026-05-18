/**
 * GB28181 国标接入页面
 *
 * 数据源策略（二选一，由 `VITE_WVP_ENABLED` 控制）：
 * ┌─────────────────┬──────────────────────────────────────────────┐
 * │ WVP_ENABLED=true │ WVP-PRO API + IndexedDB 本地预配置缓存       │
 * │                  │ 设备列表实时从 WVP 拉取，本地仅补充单位/位置  │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ WVP_ENABLED=false│ 后端 MySQL `gb28181_devices` 表              │
 * │                  │ 通过 `/iot/gb28181-devices` 正式路由读写     │
 * └─────────────────┴──────────────────────────────────────────────┘
 *
 * 生产环境建议：WVP_ENABLED=true，由 WVP-PRO 负责 SIP 信令与媒体流转。
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Video, Search, Plus, X, AlertTriangle,
  Server, Activity, Play, Wifi, WifiOff,
  Settings, Power, PowerOff, RotateCw, Trash2,
  Pencil
} from 'lucide-react';
import { useToast } from '@/core/ToastContext';
import { logger } from '@/lib/logger';
import { gb28181Service, sipServerService, deviceService, unitService } from '@/api/services';
import type { Device } from '@/types/db';
import DataContainer from '@/components/DataContainer';
import SimpleVideoPlayer from '@/components/SimpleVideoPlayer';
import type { GB28181Device } from '@/types/db';
import { statusCfg, StatCard } from './gb28181/utils';
import AddDeviceModal from './gb28181/components/AddDeviceModal';
import EditDeviceModal from './gb28181/components/EditDeviceModal';
import DetailUnitAssign from './gb28181/components/DetailUnitAssign';

export default function GB28181Page() {
  const { success, info, warning } = useToast();
  const [devices, setDevices] = useState<GB28181Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<GB28181Device | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [serverStatus, setServerStatus] = useState({ running: true, port: 5060, transport: 'UDP', registered: 0, max: 1000 });
  const [serverLoading, setServerLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [playVideo, setPlayVideo] = useState<{ streamUrl: string; name: string } | null>(null);
  const [archiveDevices, setArchiveDevices] = useState<Device[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_name: string }[]>([]);
  const [editing, setEditing] = useState<GB28181Device | null>(null);

  useEffect(() => {
    deviceService.list({ pageSize: 9999 }).then((res: any) => {
      setArchiveDevices(res.data?.list || []);
    }).catch((e) => { logger.error('[GB28181] load archive devices failed:', e); });
    unitService.list({ pageSize: 9999 }).then((res: any) => {
      setUnits(res.data?.list || []);
    }).catch((e) => { logger.error('[GB28181] load units failed:', e); });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deviceRes, statusRes] = await Promise.all([
        gb28181Service.list({ pageSize: 999 }),
        sipServerService.getStatus(),
      ]);
      if (deviceRes.code !== 200) {
        logger.error('[GB28181.loadData] device list failed:', deviceRes.message);
        setDevices([]);
      } else {
        setDevices(deviceRes.data?.list || []);
      }
      if (statusRes.code !== 200) {
        logger.error('[GB28181.loadData] status failed:', statusRes.message);
      } else {
        setServerStatus(statusRes.data || { running: true, port: 5060, transport: 'UDP', registered: 0, max: 1000 });
      }
    } catch (e) {
      logger.error('[GB28181.loadData] error=', e);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  const diagnoseDB = useCallback(async () => {
    try {
      const { DBUtils } = await import('@/db/Database');
      const stats = await DBUtils.getStats();
      info('数据库诊断', `gb28181_devices: ${stats['gb28181_devices'] || 0} 条记录`);
    } catch (e) {
      logger.error('[GB28181.diagnose] error=', e);
      warning('诊断失败', String(e));
    }
  }, [info, warning]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = devices.filter(d => {
    if (statusFilter === 'local' && !d.isLocal) return false;
    if (statusFilter !== 'all' && statusFilter !== 'local' && d.status !== statusFilter) return false;
    if (search && !d.name.includes(search) && !d.deviceId.includes(search)) return false;
    return true;
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    fault: devices.filter(d => d.status === 'fault').length,
    channels: devices.reduce((s, d) => s + (d.channelCount || 0), 0),
  };

  const handleSyncCatalog = async (device: GB28181Device) => {
    setSyncingId(device.id);
    try {
      await gb28181Service.syncCatalog(device.id);
      success('同步完成', `${device.name} 通道目录已同步`);
      await loadData();
    } catch {
      warning('同步失败', '请检查设备是否在线');
    } finally {
      setSyncingId(null);
    }
  };

  const handlePlayback = async (device: GB28181Device, channelId: string) => {
    try {
      const targetDeviceId = device.deviceId || device.id;
      const res = await gb28181Service.getStreamUrl(targetDeviceId, channelId);
      if (res.data?.streamUrl) {
        setPlayVideo({ streamUrl: res.data.streamUrl, name: `${device.name} - ${channelId}` });
      } else {
        info('回放提示', '该通道暂无录像，显示模拟画面');
      }
    } catch (err) {
      logger.error('[handlePlayback] error:', err);
      info('回放提示', '该通道暂无录像，显示模拟画面');
    }
  };

  const handleToggleServer = async () => {
    setServerLoading(true);
    try {
      if (serverStatus.running) {
        await sipServerService.stop();
        setServerStatus(prev => ({ ...prev, running: false }));
        info('SIP服务', 'SIP服务器已停止');
      } else {
        await sipServerService.start();
        setServerStatus(prev => ({ ...prev, running: true }));
        success('SIP服务', 'SIP服务器已启动');
      }
    } catch {
      warning('操作失败', 'SIP服务操作失败');
    } finally {
      setServerLoading(false);
    }
  };

  const handleAddDevice = async (formData: any) => {
    try {
      if (!serverStatus.running) {
        warning('添加失败', 'SIP服务已停止，请先启动SIP服务');
        return;
      }

      const archiveId = formData.archiveId as string | undefined;
      delete formData.archiveId;

      if (!archiveId) {
        warning('添加失败', '请先从设备档案选择GB28181摄像头设备');
        return;
      }
      if (!formData.unitId) {
        warning('添加失败', '请选择所属单位');
        return;
      }

      formData.id = archiveId;
      const archive = archiveDevices.find(d => d.id === archiveId);
      const unit = units.find(u => String(u.id) === String(formData.unitId));
      if (archive) {
        if (!formData.location) formData.location = archive.location || '';
      }
      formData.unitName = unit?.unit_name || '';

      const res = await gb28181Service.create(formData);
      if (res.code !== 200) {
        warning('添加失败', res.message || '请检查设备编码是否重复');
        return;
      }
      success('添加成功', 'GB28181接入配置已创建，等待设备注册');
      setShowAdd(false);
      await loadData();
    } catch (e: unknown) {
      logger.error('[GB28181.handleAddDevice] error=', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('duplicate') || errMsg.includes('重复') || errMsg.includes('Duplicate')) {
        warning('添加失败', '请检查设备编码是否重复');
      } else if (errMsg.includes('SIP') || errMsg.includes('sip')) {
        warning('添加失败', 'SIP服务异常，请检查SIP服务状态');
      } else {
        warning('添加失败', errMsg || '请检查设备编码是否重复');
      }
    }
  };

  const handleDeleteDevice = async (device: GB28181Device) => {
    if (!confirm(`确定要删除「${device.name}」的GB28181接入配置吗？\n（设备档案不会被删除）`)) return;
    try {
      const res = await gb28181Service.delete(device.id);
      if (res.code !== 200) {
        warning('删除失败', res.message || '请稍后重试');
        return;
      }
      success('删除成功', `已删除 ${device.name} 的GB28181接入配置`);
      await loadData();
    } catch (e) {
      logger.error('[GB28181.handleDeleteDevice] error=', e);
      warning('删除失败', '请稍后重试');
    }
  };

  const handleEditDevice = async (id: string, data: Partial<GB28181Device>) => {
    try {
      const res = await gb28181Service.update(id, data);
      if (res.code !== 200) {
        warning('修改失败', res.message || '请稍后重试');
        return;
      }
      success('修改成功', 'GB28181设备信息已更新');
      setEditing(null);
      await loadData();
      if (selected && selected.id === id) {
        setSelected(prev => prev ? { ...prev, ...data } : prev);
      }
    } catch (e) {
      logger.error('[GB28181.handleEditDevice] error=', e);
      warning('修改失败', '请稍后重试');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Video className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">GB28181 国标接入</h2>
            <p className="text-[10px] text-slate-500">国标视频设备接入配置</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleServer}
            disabled={serverLoading}
            className={`text-[10px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
              serverStatus.running
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            {serverStatus.running ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
            {serverStatus.running ? 'SIP运行中' : 'SIP已停止'}
          </button>
          <span className="text-[10px] text-slate-500 font-mono">{serverStatus.registered}/{serverStatus.max} 已注册</span>
          <button
            onClick={() => window.location.hash = '#/device-archive'}
            className="text-[10px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />创建设备档案
          </button>
          <button
            onClick={() => setShowAdd(true)}
            disabled={archiveDevices.filter(d => (d.type === 'gb28181-camera' || d.type === 'camera') && !devices.some(dev => dev.id === d.id)).length === 0}
            className="text-[10px] px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />添加接入
          </button>
          <button
            onClick={diagnoseDB}
            className="text-[10px] px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
          >
            🔍诊断
          </button>
        </div>
      </div>

      <DataContainer loading={loading} error={error} data={devices} onRetry={loadData} emptyText="暂无GB28181设备">
        <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">
          {/* Server Config Card */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              SIP 服务器配置
            </div>
            <span className="text-[10px] text-slate-500">国标域: 3402000000</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10px]">
            <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20">
              <span className="text-slate-500 block mb-0.5">SIP ID</span>
              <span className="text-slate-300 font-mono">34020000002000000001</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20">
              <span className="text-slate-500 block mb-0.5">监听地址</span>
              <span className="text-slate-300 font-mono">0.0.0.0:{serverStatus.port}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20">
              <span className="text-slate-500 block mb-0.5">传输协议</span>
              <span className="text-slate-300">{serverStatus.transport}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20">
              <span className="text-slate-500 block mb-0.5">心跳超时</span>
              <span className="text-slate-300">120 秒</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="接入设备" value={stats.total} unit="台" icon={<Server className="w-3.5 h-3.5" />} color="indigo" />
          <StatCard label="在线" value={stats.online} unit="台" icon={<Wifi className="w-3.5 h-3.5" />} color="emerald" />
          <StatCard label="离线" value={stats.offline} unit="台" icon={<WifiOff className="w-3.5 h-3.5" />} color="slate" />
          <StatCard label="故障" value={stats.fault} unit="台" icon={<AlertTriangle className="w-3.5 h-3.5" />} color="red" />
          <StatCard label="通道数" value={stats.channels} unit="路" icon={<Video className="w-3.5 h-3.5" />} color="blue" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
            {[
              { k: 'all', l: '全部' },
              { k: 'online', l: '在线' },
              { k: 'offline', l: '离线' },
              { k: 'registering', l: '注册中' },
              { k: 'fault', l: '故障' },
              { k: 'local', l: '预配置' },
            ].map(f => (
              <button
                key={f.k}
                onClick={() => setStatusFilter(f.k)}
                className={`text-[10px] px-2.5 py-1.5 rounded-md transition-all duration-200 font-medium ${
                  statusFilter === f.k
                    ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索设备ID/名称"
              className="bg-slate-800/60 border border-slate-700/40 rounded-lg pl-6 pr-2 py-1.5 text-[10px] text-slate-200 outline-none w-44"
            />
          </div>
        </div>

        {/* Device Table */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60">
                <th className="text-left p-2.5 font-medium">国标编码</th>
                <th className="text-left p-2.5 font-medium">设备名称</th>
                <th className="text-left p-2.5 font-medium">所属单位</th>
                <th className="text-left p-2.5 font-medium">厂商/型号</th>
                <th className="text-left p-2.5 font-medium">IP:Port</th>
                <th className="text-left p-2.5 font-medium">状态</th>
                <th className="text-left p-2.5 font-medium">通道</th>
                <th className="text-left p-2.5 font-medium">注册时间</th>
                <th className="text-left p-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {filtered.map(d => {
                const sc = statusCfg(d.status, d.isLocal);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors cursor-pointer"
                    onClick={() => setSelected(d)}
                  >
                    <td className="p-2.5 text-slate-400 font-mono">{d.deviceId}</td>
                    <td className="p-2.5">
                      <span className="text-slate-200 font-medium">{d.name}</span>
                      {d.catalogSynced && <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">已同步</span>}
                      {d.isLocal && <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">未注册</span>}
                    </td>
                    <td className="p-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 border border-slate-600/20 text-slate-300">{d.unitName || d.unitId || '未分配'}</span>
                    </td>
                    <td className="p-2.5 text-slate-400">{d.manufacturer} {d.model}</td>
                    <td className="p-2.5 text-slate-500 font-mono">{d.ip}:{d.port}</td>
                    <td className="p-2.5">
                      <span className={`flex items-center gap-1.5 ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400">{d.channelCount}路</td>
                    <td className="p-2.5 text-slate-500">{d.registerTime}</td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        {!d.catalogSynced && d.status === 'online' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSyncCatalog(d); }}
                            disabled={syncingId === d.id}
                            className="text-[9px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {syncingId === d.id ? <RotateCw className="w-2.5 h-2.5 animate-spin" /> : null}
                            同步目录
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                          className="text-[9px] px-2 py-1 rounded bg-slate-700/30 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          详情
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(d); }}
                          className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                        >
                          <Pencil className="w-2.5 h-2.5" />编辑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDevice(d); }}
                          className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-2.5 h-2.5" />删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">{selected.name}</span>
                <span className="text-[9px] text-slate-500 font-mono">{selected.deviceId}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
                <span className="text-slate-500 block">传输协议</span>
                <span className="text-slate-300">{selected.transport}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
                <span className="text-slate-500 block">固件版本</span>
                <span className="text-slate-300">{selected.firmware}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
                <span className="text-slate-500 block">云台支持</span>
                <span className={selected.ptzSupport ? 'text-emerald-400' : 'text-slate-500'}>{selected.ptzSupport ? '支持' : '不支持'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
                <span className="text-slate-500 block">最后心跳</span>
                <span className="text-slate-300">{selected.lastKeepalive}</span>
              </div>
              <DetailUnitAssign
                device={selected}
                units={units}
                onAssign={(unitId, unitName) => handleEditDevice(selected.id, { unitId, unitName, deviceId: selected.deviceId })}
              />
            </div>

            <div className="text-[10px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              通道列表
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {selected.channels.map(ch => (
                <div key={ch.channelId} className="p-3 rounded-lg border border-slate-700/30 bg-slate-700/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-200 font-medium">{ch.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{ch.channelId}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${ch.status === 'on' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className="text-[9px] text-slate-400">{ch.status === 'on' ? '推流中' : '离线'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlayback(selected, ch.channelId)}
                    className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                    title="播放"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DataContainer>

    {/* Add Device Modal */}
    {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onSubmit={handleAddDevice} archiveDevices={archiveDevices} gbDevices={devices} sipRunning={serverStatus.running} units={units} />}

    {/* Edit Device Modal */}
    {editing && <EditDeviceModal device={editing} onClose={() => setEditing(null)} onSubmit={handleEditDevice} units={units} />}

    {/* Video Player Modal */}
    {playVideo && <SimpleVideoPlayer streamUrl={playVideo.streamUrl} title={playVideo.name} onClose={() => setPlayVideo(null)} />}
  </div>
);
}
