import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { deviceService } from '@/api/services';
import type { QueryParams, ApiResponse, PaginatedData, Device } from '@/types/db';
import { Settings, Server } from 'lucide-react';
import { useToast } from '@/core/ToastContext';
import { getErrorMessage } from '@/types/api';

const typeMap: Record<string, string> = {
  detector: '烟感', button: '手报', pump: '消防泵', fan: '风机',
  sensor: '传感器', monitor: '监控器', controller: '控制器',
  alarm: '报警器', host: '报警主机', elevator: '电梯', broadcast: '广播',
  camera: '摄像头', 'gb28181-camera': 'GB28181摄像头',
  'fire-controller': '火灾报警控制器', water: '水源监测',
  electrical: '电气火灾', 'smoke-exhaust': '防排烟', lighting: '应急照明',
  'iot-sensor': 'IoT传感器', 'elec-monitor': '电气监测',
  'pressure-sensor': '压力传感器', 'fan-controller': '风机控制',
  'level-sensor': '液位传感器', 'user-transmission-device': '用户信息传输装置',
};

const protocolMap: Record<string, string> = {
  gb26875: 'GB26875', modbus: 'Modbus', modbustcp: 'ModbusTCP',
  mqtt: 'MQTT', nbiot: 'NB-IoT', gb28181: 'GB28181', tcp: 'TCP',
};

function parseCfg(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** 列表数据来自 fire_device，配置读写走 /devices/:id/config */
const deviceConfigListService = {
  async list(params: QueryParams = {}): Promise<ApiResponse<PaginatedData<Record<string, unknown>>>> {
    /* 设备配置只显示有实际IoT接入配置的设备，避免档案状态被人为改大后出现空配置 */
    const res = await deviceService.list({ ...params, minLifecycleStatus: 2, hasIotConfig: 'true' });
    if (res.code !== 200 || !res.data?.list) {
      return res as unknown as ApiResponse<PaginatedData<Record<string, unknown>>>;
    }
    const list = (res.data.list as unknown as Device[]).map((raw) => {
      const r = raw as unknown as Record<string, unknown>;
      const cfg = parseCfg(r.protocol_config);
      const hi = cfg.heartbeat_interval;
      const heartbeat = typeof hi === 'number' ? hi : parseInt(String(hi ?? 30), 10) || 30;
      const rce = cfg.remote_control_enabled;
      const remoteOn = rce === 1 || rce === '1' || rce === true;
      const st = r.status;
      const deviceStatus = st === 1 || st === '1' ? 'normal' : st === 2 || st === '2' ? 'fault' : 'offline';
      return {
        id: String(r.id),
        device_id: String(r.id),
        device_code: r.device_no,
        device_name: r.device_name,
        category: r.device_type,
        protocol_type: r.protocol_type || '',
        heartbeat_interval: heartbeat,
        remote_control_enabled: remoteOn,
        device_status: deviceStatus,
      };
    });
    return {
      ...res,
      data: {
        ...res.data,
        list,
      },
    } as unknown as ApiResponse<PaginatedData<Record<string, unknown>>>;
  },
  async update(id: string, data: Record<string, unknown>) {
    return deviceService.saveConfig(id, data);
  },
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
  { key: 'device_id', label: '设备ID', type: 'readonly' as const },
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
  const { success, error: toastError } = useToast();
  const [configModal, setConfigModal] = useState<{ deviceId: string; deviceName: string } | null>(null);
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    device_id: '',
    protocol_type: 'gb26875',
    heartbeat_interval: 30,
    data_collection_interval: 60,
    auto_report: '1',
    mute_enabled: '1',
    reset_enabled: '1',
    remote_control_enabled: '1',
  });

  const loadConfig = useCallback(async (deviceId: string) => {
    setLoadingCfg(true);
    try {
      const res = await deviceService.getConfig(deviceId);
      if (res.code !== 200 || !res.data) {
        toastError('加载失败', '无法读取设备配置');
        return;
      }
      const d = res.data as Record<string, unknown>;
      setForm({
        device_id: String(d.device_id ?? deviceId),
        protocol_type: String(d.protocol_type ?? 'gb26875'),
        heartbeat_interval: Number(d.heartbeat_interval ?? 30),
        data_collection_interval: Number(d.data_collection_interval ?? 60),
        auto_report: String(d.auto_report ?? '1'),
        mute_enabled: String(d.mute_enabled ?? '1'),
        reset_enabled: String(d.reset_enabled ?? '1'),
        remote_control_enabled: String(d.remote_control_enabled ?? '0'),
      });
    } catch (e: unknown) {
      toastError('加载失败', getErrorMessage(e, '请检查网络'));
    } finally {
      setLoadingCfg(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (configModal?.deviceId) void loadConfig(configModal.deviceId);
  }, [configModal?.deviceId, loadConfig]);

  return (
    <>
      <div className="mb-3">
        <DeviceManagementFlowHint active="config" />
      </div>
      <PageTemplate
        title="设备配置"
        icon={Settings}
        columns={COLUMNS}
        service={deviceConfigListService as any}
        fields={FIELDS}
        filterFields={FILTER_FIELDS}
        addable={false}
        actions={false}
        pageSize={20}
        renderExtraActions={(row) => (
          <button
            type="button"
            onClick={() => setConfigModal({ deviceId: String(row.device_id), deviceName: String(row.device_name) })}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-[10px] transition-colors"
            title="完整配置"
          >
            <Server className="w-3 h-3" />配置
          </button>
        )}
        badge="业务参数"
        badgeColor="text-violet-400 bg-violet-500/10 border-violet-500/20"
        emptyDescription="面向「已接入」及以上生命周期的设备：维护采集间隔、阈值策略、联动与远程控制等业务侧参数。通信协议、IP、MQTT/CTWing 等请在「设备接入」配置。"
      />
      {configModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => !saving && setConfigModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-slate-200 mb-1">设备通信配置</h3>
            <p className="text-[10px] text-slate-500 mb-4">{configModal.deviceName} · ID {configModal.deviceId}</p>
            {loadingCfg ? (
              <p className="text-xs text-slate-400 py-8 text-center">加载配置中…</p>
            ) : (
              <div className="space-y-3">
                {[
                  { k: 'protocol_type', label: '协议类型', type: 'select', options: FIELDS.find(f => f.key === 'protocol_type')?.options as { label: string; value: string }[] },
                  { k: 'heartbeat_interval', label: '心跳间隔(秒)', type: 'number' },
                  { k: 'data_collection_interval', label: '数据采集间隔(秒)', type: 'number' },
                  { k: 'auto_report', label: '自动上报', type: 'select', options: [{ label: '是', value: '1' }, { label: '否', value: '0' }] },
                  { k: 'mute_enabled', label: '允许消音', type: 'select', options: [{ label: '是', value: '1' }, { label: '否', value: '0' }] },
                  { k: 'reset_enabled', label: '允许复位', type: 'select', options: [{ label: '是', value: '1' }, { label: '否', value: '0' }] },
                  { k: 'remote_control_enabled', label: '允许远程控制', type: 'select', options: [{ label: '是', value: '1' }, { label: '否', value: '0' }] },
                ].map((field) => (
                  <div key={field.k}>
                    <label className="text-[10px] text-slate-400 block mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200"
                        value={String((form as Record<string, unknown>)[field.k] ?? '')}
                        onChange={(e) => setForm({ ...form, [field.k]: e.target.value })}
                      >
                        {(field.options || []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200"
                        value={Number((form as Record<string, unknown>)[field.k] ?? 0)}
                        onChange={(e) => setForm({ ...form, [field.k]: parseInt(e.target.value, 10) || 0 })}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" disabled={saving} onClick={() => setConfigModal(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg">取消</button>
              <button
                type="button"
                disabled={loadingCfg || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await deviceService.saveConfig(configModal.deviceId, {
                      protocol_type: form.protocol_type,
                      heartbeat_interval: form.heartbeat_interval,
                      data_collection_interval: form.data_collection_interval,
                      auto_report: form.auto_report,
                      mute_enabled: form.mute_enabled,
                      reset_enabled: form.reset_enabled,
                      remote_control_enabled: form.remote_control_enabled,
                    });
                    if (res.code !== 200) {
                      toastError('保存失败', (res as { msg?: string }).msg || '请重试');
                      return;
                    }
                    success('已保存', '设备通信配置已写入');
                    setConfigModal(null);
                  } catch (e: unknown) {
                    toastError('保存失败', getErrorMessage(e, '请重试'));
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
