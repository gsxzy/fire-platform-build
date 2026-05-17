import { useState, useEffect, useCallback } from 'react';
import {
  Video, Search, Plus, X, AlertTriangle,
  Server, Activity, Save, Play, Wifi, WifiOff,
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
      // 设备列表已加载
      if (deviceRes.code !== 200) {
        logger.error('[GB28181.loadData] device list failed:', deviceRes.message);
        setDevices([]);
      } else {
        setDevices(deviceRes.data?.list || []);
      }
      if (statusRes.code !== 200) {
        logger.error('[GB28181.loadData] status failed:', statusRes.message);
        // 单次拉取失败不强行改为「已停止」，避免网络抖动造成 SIP 看起来自动停止
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

  /* 诊断：直接读取 IndexedDB */
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

      // 使用设备档案主键作为国标表 id（一对一）
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
      // 仅删除GB28181接入记录，保留设备档案
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
      // 如果当前选中的设备被修改，同步更新 selected 状态
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
              {/* ── 所属单位快速分配 ── */}
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

    {/* Add Device Modal - 移到 DataContainer 外部，确保空状态时也能显示 */}
    {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onSubmit={handleAddDevice} archiveDevices={archiveDevices} gbDevices={devices} sipRunning={serverStatus.running} units={units} />}

    {/* Edit Device Modal */}
    {editing && <EditDeviceModal device={editing} onClose={() => setEditing(null)} onSubmit={handleEditDevice} units={units} />}

    {/* Video Player Modal */}
    {playVideo && <SimpleVideoPlayer streamUrl={playVideo.streamUrl} title={playVideo.name} onClose={() => setPlayVideo(null)} />}
  </div>
);
}

/* ───── Add Device Modal ───── */
function AddDeviceModal({ onClose, onSubmit, archiveDevices, gbDevices, sipRunning, units }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  archiveDevices: Device[];
  gbDevices: GB28181Device[];
  sipRunning: boolean;
  units: { id: string; unit_name: string }[];
}) {
  const { warning } = useToast();
  const [selectedArchiveId, setSelectedArchiveId] = useState('');
  const [form, setForm] = useState({
    deviceId: '', name: '', ip: '', port: '5060', manufacturer: '', model: '',
    transport: 'UDP' as 'UDP' | 'TCP', username: '', password: '', unitId: '',
    location: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSelectArchive = (id: string) => {
    setSelectedArchiveId(id);
    setFieldErrors({});
    const d = archiveDevices.find(x => x.id === id);
    if (d) {
      setForm(prev => ({
        ...prev,
        name: d.name,
        unitId: d.unitId,
        location: d.location || '',
        manufacturer: d.manufacturer || '',
        model: d.model || '',
      }));
    }
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!sipRunning) {
      warning('SIP服务已停止', '请先启动SIP服务后再添加设备');
      return;
    }
    if (!form.deviceId) errors.deviceId = '请填写国标设备编码';
    if (!form.name) errors.name = '请填写设备名称';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const data = {
      id: `GB-${Date.now()}`,
      ...form,
      port: Number(form.port),
      status: 'offline',
      registerTime: null,
      lastKeepalive: null,
      channelCount: 0,
      channels: [],
      catalogSynced: false,
      ptzSupport: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
    if (selectedArchiveId) {
      data.archiveId = selectedArchiveId;
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Video className="w-4 h-4 text-indigo-400" />添加GB28181设备</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Archive Device Selection */}
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">从设备档案选择 <span className="text-red-400">*</span></label>
            <select
              value={selectedArchiveId}
              onChange={e => handleSelectArchive(e.target.value)}
              className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="">请选择档案设备</option>
              {archiveDevices
                .filter(d => (d.type === 'gb28181-camera' || d.type === 'camera') && !gbDevices.some(dev => dev.id === d.id))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.id} - {d.name} ({d.unitName || d.unitId} / {d.location})</option>
                ))}
            </select>
            {archiveDevices.filter(d => (d.type === 'gb28181-camera' || d.type === 'camera') && !gbDevices.some(dev => dev.id === d.id)).length === 0 && (
              <div className="mt-1.5 text-[10px] text-amber-400">
                无可用的 GB28181 档案设备，请先前往 <a href="#/device-archive" className="underline hover:text-amber-300">设备档案</a> 创建「GB28181摄像头」类型设备并入库。
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">国标设备编码 <span className="text-red-400">*</span></label>
              <input value={form.deviceId} onChange={e => { setForm({ ...form, deviceId: e.target.value }); if (fieldErrors.deviceId) setFieldErrors(prev => { const n = { ...prev }; delete n.deviceId; return n; }); }} placeholder="34020000001320000001" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono ${fieldErrors.deviceId ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.deviceId && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.deviceId}</span>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备名称 <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }} placeholder="大厅摄像头" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none ${fieldErrors.name ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.name && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.name}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">IP地址</label>
              <input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.xxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">端口</label>
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">厂商</label>
              <input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="海康威视" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">型号</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="DS-2CD3T25" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">传输协议</label>
              <select value={form.transport} onChange={e => setForm({ ...form, transport: e.target.value as 'UDP' | 'TCP' })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                <option>UDP</option><option>TCP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">所属单位 <span className="text-red-400">*</span></label>
              <select
                value={form.unitId}
                onChange={e => setForm({ ...form, unitId: e.target.value })}
                className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="">请选择单位</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">安装位置</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="1F大厅" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.deviceId || !form.name} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors">
            <Save className="w-3.5 h-3.5" />确认添加
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Edit Device Modal ───── */
function EditDeviceModal({ device, onClose, onSubmit, units }: {
  device: GB28181Device;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<GB28181Device>) => void;
  units: { id: string; unit_name: string }[];
}) {
  const { warning } = useToast();
  const [form, setForm] = useState({
    deviceId: device.deviceId || '',
    name: device.name || '',
    ip: device.ip || '',
    port: String(device.port || 5060),
    manufacturer: device.manufacturer || '',
    model: device.model || '',
    transport: (device.transport as 'UDP' | 'TCP') || 'UDP',
    username: device.username || '',
    password: device.password || '',
    location: device.location || '',
    unitId: device.unitId || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.deviceId) errors.deviceId = '请填写国标设备编码';
    if (!form.name) errors.name = '请填写设备名称';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      warning('表单校验失败', '请检查红色标注的必填项');
      return;
    }
    setFieldErrors({});
    const unit = units.find(u => String(u.id) === String(form.unitId));
    onSubmit(device.id, {
      ...form,
      port: Number(form.port),
      unitName: unit?.unit_name || '',
      deviceId: form.deviceId || device.deviceId,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Pencil className="w-4 h-4 text-amber-400" />编辑GB28181设备</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">国标设备编码 <span className="text-red-400">*</span></label>
              <input value={form.deviceId} onChange={e => { setForm({ ...form, deviceId: e.target.value }); if (fieldErrors.deviceId) setFieldErrors(prev => { const n = { ...prev }; delete n.deviceId; return n; }); }} placeholder="34020000001320000001" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono ${fieldErrors.deviceId ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.deviceId && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.deviceId}</span>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备名称 <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }} placeholder="大厅摄像头" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none ${fieldErrors.name ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.name && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.name}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">IP地址</label>
              <input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.xxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">端口</label>
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">厂商</label>
              <input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="海康威视" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">型号</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="DS-2CD3T25" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">传输协议</label>
              <select value={form.transport} onChange={e => setForm({ ...form, transport: e.target.value as 'UDP' | 'TCP' })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                <option>UDP</option><option>TCP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">安装位置</label>
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="1F大厅" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">所属单位</label>
            <select value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
              <option value="">-- 请选择单位 --</option>
              {units.map(u => (
                <option key={u.id} value={String(u.id)}>{u.unit_name}</option>
              ))}
            </select>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400">
            提示：修改国标编码后，如果该摄像头已在平面图中绑定，需要重新绑定关联关系。
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.deviceId || !form.name} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors">
            <Save className="w-3.5 h-3.5" />确认修改
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Detail Panel: 所属单位快速分配 ───── */
function DetailUnitAssign({ device, units, onAssign }: {
  device: GB28181Device;
  units: { id: string; unit_name: string }[];
  onAssign: (unitId: string, unitName: string) => void;
}) {
  const [unitId, setUnitId] = useState(device.unitId || '');
  const [saving, setSaving] = useState(false);
  const { success, warning } = useToast();

  const currentUnit = units.find(u => String(u.id) === String(device.unitId));
  const hasUnit = !!currentUnit;

  const handleSave = async () => {
    if (!unitId) {
      warning('请选择单位', '所属单位不能为空');
      return;
    }
    const unit = units.find(u => String(u.id) === String(unitId));
    if (!unit) return;
    setSaving(true);
    try {
      await onAssign(String(unit.id), unit.unit_name);
      success('分配成功', `已分配到 ${unit.unit_name}`);
    } catch (e) {
      warning('分配失败', '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
      <span className="text-slate-500 block mb-1">所属单位</span>
      <div className="flex items-center gap-2">
        <select
          value={unitId}
          onChange={e => setUnitId(e.target.value)}
          className="flex-1 bg-slate-800/50 border border-slate-600/30 rounded px-2 py-1 text-xs text-slate-200 outline-none"
        >
          <option value="">-- 请选择单位 --</option>
          {units.map(u => (
            <option key={u.id} value={String(u.id)}>{u.unit_name}</option>
          ))}
        </select>
        {(!hasUnit || unitId !== String(device.unitId || '')) && (
          <button
            onClick={handleSave}
            disabled={saving || !unitId}
            className="px-2 py-1 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded text-[10px] transition-colors disabled:opacity-40"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        )}
      </div>
      {hasUnit && unitId === String(device.unitId || '') && (
        <span className="text-emerald-400 mt-1 block">✓ 已分配: {currentUnit.unit_name}</span>
      )}
    </div>
  );
}

/* ───── Status Config ───── */
function statusCfg(s: string, isLocal?: boolean) {
  if (isLocal) return { label: '预配置', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' };
  switch (s) {
    case 'online': return { label: '在线', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' };
    case 'registering': return { label: '注册中', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400 animate-pulse' };
    case 'offline': return { label: '离线', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };
    case 'fault': return { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400' };
    default: return { label: s, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };
  }
}

/* ───── Stat Card ───── */
function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: React.ReactNode; color: 'indigo' | 'emerald' | 'slate' | 'red' | 'blue';
}) {
  const map: Record<string, { text: string; bg: string; border: string; iconColor: string }> = {
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
    slate: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', iconColor: 'text-slate-400' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', iconColor: 'text-red-400' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
  };
  const c = map[color];
  return (
    <div className={`rounded-xl p-3 border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <div className={c.iconColor}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${c.text} tabular-nums`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
