import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Cable, ChevronRight, CheckCircle, XCircle, Save,
  FileText, ToggleRight, ToggleLeft, Edit3,
  Server, Wifi, Globe, Lock, Cpu, RefreshCw, Loader2,
  Video, Shield, Radio,
} from 'lucide-react';
import { api } from '@/api/client';
import { legacyApi } from '@/api/services';
import { useToast } from '@/core/ToastContext';
import EmptyState from '@/components/EmptyState';

/* ═══════ 与后端 fire_protocol_config / iot_protocols 表对齐的展示模型 ═══════ */
type ProtocolKind =
  | 'modbus-tcp'
  | 'modbus-rtu'
  | 'mqtt'
  | 'tcp-transparent'
  | 'gb26875'
  | 'gb28181'
  | 'https'
  | 'http'
  | 'udp'
  | 'private';

interface ProtocolProfile {
  id: string;
  name: string;
  type: ProtocolKind;
  /** 对应库表 status：1 启用 0 停用 */
  enabled: boolean;
  description: string;
  config: Record<string, string>;
  deviceCount: number;
  parseSuccess: number;
  parseFail: number;
  lastUpdate: string;
  /** 原始 protocol_type 字符串（便于对照文档） */
  protocolTypeRaw: string;
}

function parseConfigToMap(raw: unknown): Record<string, string> {
  if (raw == null || raw === '') {
    return { 提示: '可在库表 fire_protocol_config.config_json 中维护 JSON（如 host、port、slaveId）' };
  }
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
        ])
      );
    } catch {
      return { 原始配置: raw };
    }
  }
  if (typeof raw === 'object') {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
        k,
        v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
      ])
    );
  }
  return { 值: String(raw) };
}

/** 将库表 protocol_type 规范为页面分类（支持 GB28181、Modbus、MQTT 等写法） */
function normalizeProtocolKind(raw: string): ProtocolKind {
  const t = raw.toLowerCase().replace(/[/\s.]+/g, '-').replace(/_+/g, '-');
  if (t.includes('gb28181') || t === '28181' || t.includes('28181')) return 'gb28181';
  if (t.includes('gb26875') || t.includes('26875') || t.includes('fscn')) return 'gb26875';
  if (t.includes('modbus') && t.includes('rtu')) return 'modbus-rtu';
  if (t.includes('modbus')) return 'modbus-tcp';
  if (t.includes('mqtt')) return 'mqtt';
  if (t.includes('https')) return 'https';
  if (t.includes('http')) return 'http';
  if (t.includes('udp')) return 'udp';
  if (t.includes('tcp') || t.includes('transparent') || t.includes('透传')) return 'tcp-transparent';
  if (t.includes('private') || t.includes('私有')) return 'private';
  return 'private';
}

function mapFireProtocolConfigRow(row: Record<string, unknown>): ProtocolProfile {
  const id = String(row.id ?? '');
  const protocolTypeRaw = String(row.protocol_type ?? '');
  const status = row.status;
  const enabled = status !== 0 && status !== '0' && status !== false;
  return {
    id,
    name: String(row.protocol_name ?? '未命名协议'),
    type: normalizeProtocolKind(protocolTypeRaw || 'private'),
    enabled,
    description: String(row.description ?? ''),
    config: parseConfigToMap(row.config_json ?? row.configJson),
    deviceCount: Number(row.device_count ?? row.deviceCount ?? 0),
    parseSuccess: Number(row.parse_success ?? row.parseSuccess ?? 0),
    parseFail: Number(row.parse_fail ?? row.parseFail ?? 0),
    lastUpdate: String(
      row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? ''
    ),
    protocolTypeRaw: protocolTypeRaw || '—',
  };
}

function mapIotProtocolsStubRow(row: Record<string, unknown>): ProtocolProfile {
  const id = String(row.id ?? '');
  const protocolTypeRaw = String(row.protocol_type ?? '');
  const status = row.status;
  const enabled = status === 1 || status === '1';
  return {
    id,
    name: String(row.protocol_name ?? `协议 ${id}`),
    type: normalizeProtocolKind(protocolTypeRaw || 'private'),
    enabled,
    description: '',
    config: parseConfigToMap(row.config),
    deviceCount: 0,
    parseSuccess: 0,
    parseFail: 0,
    lastUpdate: String(row.created_at ?? row.updated_at ?? ''),
    protocolTypeRaw: protocolTypeRaw || '—',
  };
}

async function fetchProtocolsUnified(): Promise<ProtocolProfile[]> {
  try {
    const primary = await legacyApi.protocolList();
    const rows = Array.isArray(primary) ? primary : [];
    if (rows.length > 0) {
      return (rows as Record<string, unknown>[]).map(mapFireProtocolConfigRow);
    }
  } catch {
    /* 走兼容路径 */
  }

  try {
    const res = await api.get<{ list: Record<string, unknown>[] }>('/iot-protocols/list', {
      page: 1,
      pageSize: 200,
    });
    if (res.code === 200 && res.data?.list?.length) {
      return res.data.list.map(mapIotProtocolsStubRow);
    }
  } catch {
    /* empty */
  }

  return [];
}

const typeConfig = (type: ProtocolKind) => {
  switch (type) {
    case 'modbus-tcp':
      return { label: 'Modbus TCP', icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'modbus-rtu':
      return { label: 'Modbus RTU', icon: Cable, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
    case 'mqtt':
      return { label: 'MQTT', icon: Wifi, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    case 'tcp-transparent':
      return { label: 'TCP 透传', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    case 'gb26875':
      return { label: 'GB 26875.1', icon: Radio, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    case 'gb28181':
      return { label: 'GB/T 28181', icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
    case 'https':
      return { label: 'HTTPS', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    case 'http':
      return { label: 'HTTP', icon: Globe, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' };
    case 'udp':
      return { label: 'UDP', icon: Radio, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    case 'private':
      return { label: '私有协议', icon: Lock, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    default:
      return { label: type, icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  }
};

export default function ProtocolConfigPage() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [profiles, setProfiles] = useState<ProtocolProfile[]>([]);
  const [selected, setSelected] = useState<ProtocolProfile | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadList(options?: { silent?: boolean }) {
    const silent = options?.silent;
    if (!silent) setLoading(true);
    try {
      const list = await fetchProtocolsUnified();
      setProfiles(list);
      setSelected(prev => {
        if (prev && list.some(p => p.id === prev.id)) {
          return list.find(p => p.id === prev.id) ?? null;
        }
        return list[0] ?? null;
      });
    } catch {
      setProfiles([]);
      setSelected(null);
      toastError('加载失败', '无法读取协议配置，请检查登录与 /iot/protocols 服务');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, []);

  const toggleEnable = async (id: string) => {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    const next = !p.enabled;
    setProfiles(prev => prev.map(x => (x.id === id ? { ...x, enabled: next } : x)));
    if (selected?.id === id) setSelected({ ...p, enabled: next });
    try {
      await legacyApi.updateProtocol(Number(id), { status: next ? 1 : 0 });
      toastSuccess(next ? '已启用' : '已停用', p.name);
    } catch {
      setProfiles(prev => prev.map(x => (x.id === id ? { ...x, enabled: !next } : x)));
      if (selected?.id === id) setSelected({ ...p, enabled: !next });
      toastError('更新失败', '无法写入协议状态，请检查接口权限');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadList({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = profiles.filter(
    p =>
      !search ||
      p.name.includes(search) ||
      p.type.includes(search) ||
      p.protocolTypeRaw.includes(search) ||
      p.description.includes(search)
  );

  const totalSuccess = profiles.reduce((s, p) => s + p.parseSuccess, 0);
  const totalFail = profiles.reduce((s, p) => s + p.parseFail, 0);
  const totalDevices = profiles.reduce((s, p) => s + p.deviceCount, 0);
  const hasParseStats = totalSuccess + totalFail > 0;

  const statCards = [
    { label: '协议配置', value: profiles.length, Icon: FileText, iconClass: 'text-blue-400' },
    { label: '已启用', value: profiles.filter(p => p.enabled).length, Icon: CheckCircle, iconClass: 'text-emerald-400' },
    { label: '关联设备(回写)', value: totalDevices, Icon: Cpu, iconClass: 'text-purple-400' },
    {
      label: '解析成功',
      value: hasParseStats ? totalSuccess.toLocaleString() : '—',
      Icon: CheckCircle,
      iconClass: 'text-green-400',
    },
    {
      label: '解析失败',
      value: hasParseStats ? totalFail.toLocaleString() : '—',
      Icon: XCircle,
      iconClass: 'text-red-400',
    },
  ];

  const parseRate = (p: ProtocolProfile) => {
    const sum = p.parseSuccess + p.parseFail;
    if (sum <= 0) return null;
    return ((p.parseSuccess / sum) * 100).toFixed(2);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Cable className="w-4 h-4 text-blue-400" />
          <span>IoT 接入层</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">协议解析配置</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/device/access')}
            className="text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
          >
            设备接入
          </button>
          <button
            type="button"
            onClick={() => navigate('/iot/gb28181')}
            className="text-[10px] px-2.5 py-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
          >
            GB28181 设备
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-600/40 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed max-w-4xl">
        主数据源为后端 <span className="text-slate-400 font-mono">GET /api/iot/protocols</span>（表{' '}
        <span className="text-slate-400">fire_protocol_config</span>）。若为空则自动尝试{' '}
        <span className="text-slate-400 font-mono">/api/iot-protocols/list</span>（兼容库表{' '}
        <span className="text-slate-400">iot_protocols</span>）。协议类型字段支持如{' '}
        <span className="text-slate-400">gb28181、modbus-tcp、mqtt、gb26875</span> 等，页面统一映射展示。
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {loading ? (
          <div className="col-span-2 sm:col-span-5 flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <span className="text-xs">数据加载中，请稍候…</span>
          </div>
        ) : (
          statCards.map((s, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{s.label}</span>
                <s.Icon className={`w-4 h-4 ${s.iconClass}`} />
              </div>
              <div className="text-2xl font-bold text-slate-100">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {!loading && !hasParseStats && profiles.length > 0 && (
        <p className="text-[10px] text-amber-400/90 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
          当前库表未回写解析条数（parse_success / parse_fail）。接入采集与解析引擎后写入扩展字段即可在此展示成功率。
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-80 flex-shrink-0 space-y-2">
          <div className="relative mb-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索名称、类型、protocol_type..."
              className="w-full bg-slate-700/30 border border-slate-600/30 rounded pl-7 pr-2 py-1.5 text-[10px] text-slate-200 outline-none"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="border border-dashed border-slate-600/40 rounded-lg overflow-hidden">
              <EmptyState
                type="data"
                title="暂无协议配置"
                description={
                  '可在表 fire_protocol_config（或兼容库 iot_protocols）中维护记录，或通过后端开放接口创建。配置保存后此处将自动同步展示。'
                }
                className="py-8"
              />
            </div>
          ) : (
            filtered.map(p => {
              const tc = typeConfig(p.type);
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(p)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setSelected(p);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selected?.id === p.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <tc.icon className={`w-3.5 h-3.5 flex-shrink-0 ${tc.color}`} />
                      <span className="text-[11px] text-slate-200 font-medium truncate">{p.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        void toggleEnable(p.id);
                      }}
                      aria-label="启用或停用"
                    >
                      {p.enabled ? (
                        <ToggleRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] px-1 py-0.5 rounded ${tc.bg} ${tc.color}`}>{tc.label}</span>
                    <span className="text-[8px] text-slate-500 font-mono truncate max-w-[9rem]" title={p.protocolTypeRaw}>
                      {p.protocolTypeRaw}
                    </span>
                    {p.deviceCount > 0 && (
                      <span className="text-[8px] text-slate-500">{p.deviceCount} 台</span>
                    )}
                    {p.parseSuccess + p.parseFail > 0 && (
                      <span className="text-[8px] text-emerald-400">{p.parseSuccess.toLocaleString()} 条 OK</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700/30 p-4 min-h-[320px]">
          {selected ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const tc = typeConfig(selected.type);
                    return <tc.icon className={`w-5 h-5 flex-shrink-0 ${tc.color}`} />;
                  })()}
                  <span className="text-sm font-bold text-slate-200 truncate">{selected.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">id={selected.id}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    className={`text-[9px] px-2 py-1 rounded border ${
                      selected.enabled ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-600 text-slate-500'
                    }`}
                  >
                    {selected.enabled ? '启用' : '停用'}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] px-3 py-1.5 bg-slate-700/40 text-slate-400 rounded cursor-not-allowed border border-slate-600/30 flex items-center gap-1"
                    title="完整编辑请使用管理端或数据库维护"
                  >
                    <Edit3 className="w-3 h-3" />
                    编辑
                  </button>
                  <button
                    type="button"
                    className="text-[10px] px-3 py-1.5 bg-slate-700/40 text-slate-400 rounded cursor-not-allowed border border-slate-600/30 flex items-center gap-1"
                    title="保存请调用 PUT /iot/protocols/:id"
                  >
                    <Save className="w-3 h-3" />
                    保存
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mb-3 text-[10px]">
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/40 p-2">
                  <span className="text-slate-500 block mb-0.5">展示分类（映射后）</span>
                  <span className="text-slate-200">{typeConfig(selected.type).label}</span>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-slate-700/40 p-2">
                  <span className="text-slate-500 block mb-0.5">库表 protocol_type</span>
                  <span className="text-slate-200 font-mono">{selected.protocolTypeRaw}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-4 whitespace-pre-wrap">{selected.description || '（无描述）'}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-emerald-400">
                    {parseRate(selected) != null ? `${parseRate(selected)}%` : '—'}
                  </div>
                  <div className="text-[9px] text-slate-500">解析成功率</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-slate-200">{selected.parseSuccess.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-500">成功条数</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-red-400">{selected.parseFail.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-500">失败条数</div>
                </div>
                <div className="p-2 bg-slate-700/20 rounded text-center">
                  <div className="text-sm font-bold text-blue-400">{selected.deviceCount}</div>
                  <div className="text-[9px] text-slate-500">关联设备</div>
                </div>
              </div>

              <div className="mb-2 text-[11px] text-slate-300 font-medium">协议参数（config_json / config）</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {Object.entries(selected.config).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 p-2 bg-slate-700/20 rounded">
                    <span className="text-[10px] text-slate-500 w-28 flex-shrink-0 break-all">{k}</span>
                    <span className="text-[10px] text-slate-200 font-mono break-all">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-2.5 bg-slate-700/20 rounded flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-slate-400">
                  最后更新:{' '}
                  <span className="text-slate-300 font-mono">{selected.lastUpdate || '—'}</span>
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              type="custom"
              title="请选择协议配置"
              description="在左侧列表中点选一条协议后，将在此展示类型、连接参数、启用状态与解析统计，便于交付验收与运维核对。"
              className="py-12"
            />
          )}
        </div>
      </div>
    </div>
  );
}
