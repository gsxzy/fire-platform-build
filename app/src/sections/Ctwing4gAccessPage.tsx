/**
 * CTWing 海康4G（烟感/压力/液位）专用接入配置
 * 流程：入库管理建档（device_sn 与 CTWing 设备 ID 一致）→ 本页填写 MQTT/CTWing 参数 → 保存写入 fire_iot_device
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Radio, Loader2, Save, ArrowLeft } from 'lucide-react';
import { deviceService, iotService } from '@/api/services';
import { useToast } from '@/core/ToastContext';
import { getErrorMessage } from '@/types/api';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';

const HK_TYPES = [
  { value: 'hikvision-smoke', label: '海康4G 烟感' },
  { value: 'hikvision-pressure', label: '海康4G 压力' },
  { value: 'hikvision-level', label: '海康4G 液位' },
];

function buildCtwingIotBody(p: {
  archiveDeviceId: string;
  deviceName: string;
  category: string;
  productId: string;
  ctwingDeviceId: string;
  ctwingPassword: string;
  broker: string;
  keepalive: number;
  thresholdsJson: string;
  imei?: string;
}) {
  let thresholds: Record<string, number> | undefined;
  if (p.thresholdsJson.trim()) {
    try {
      const o = JSON.parse(p.thresholdsJson) as unknown;
      thresholds = o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, number>) : undefined;
    } catch {
      thresholds = undefined;
    }
  }
  return {
    archiveDeviceId: p.archiveDeviceId.trim(),
    deviceSn: p.ctwingDeviceId.trim(), /* CTWing平台设备ID作为IoT device_sn，确保推送可匹配 */
    name: p.deviceName.trim() || 'CTWing 设备',
    category: p.category,
    protocol: 'MQTT',
    imei: p.imei?.trim() || undefined,
    productId: p.productId.trim() || undefined,
    ctwingDeviceId: p.ctwingDeviceId.trim() || undefined,
    ctwingPassword: p.ctwingPassword.trim() || undefined,
    broker: p.broker.trim() || undefined,
    keepalive: p.keepalive,
    thresholds,
    heartbeatInterval: 30,
    registerCount: 10,
    floor: '1F',
    onlineStatus: 'offline' as const,
    status: 'offline' as const,
    lastHeartbeat: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function Ctwing4gAccessPage() {
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [loadingArchives, setLoadingArchives] = useState(true);
  const [archives, setArchives] = useState<{ id: string; name: string; sn: string; type: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [archiveId, setArchiveId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [category, setCategory] = useState('hikvision-smoke');
  const [productId, setProductId] = useState('2000614607');
  const [ctwingDeviceId, setCtwingDeviceId] = useState('');
  const [ctwingPassword, setCtwingPassword] = useState('');
  const [broker, setBroker] = useState('2000614607.non-nb.ctwing.cn');
  const [keepalive, setKeepalive] = useState(120);
  const [thresholdsJson, setThresholdsJson] = useState(
    '{\n  "smoke": 1,\n  "temperature": 60,\n  "pressure": 1.6,\n  "pressureLow": 0.1,\n  "levelHigh": 4.5,\n  "levelLow": 0.5\n}'
  );
  const [imei, setImei] = useState('');

  useEffect(() => {
    setLoadingArchives(true);
    deviceService
      .list({ pageSize: 2000, lifecycleStatus: '1,2,3' })
      .then((r: { data?: { list?: unknown[] } }) => {
        const rows = r.data?.list || [];
        setArchives(
          rows.map((raw: unknown) => {
            const r = raw as Record<string, unknown>;
            return {
            id: String(r.id ?? ''),
            name: String(r.device_name ?? r.name ?? ''),
            sn: String(r.device_sn ?? r.serialNo ?? '').trim(),
            type: String(r.device_type ?? r.type ?? ''),
          };
          })
        );
      })
      .catch((e: unknown) => {
        toastError('加载失败', getErrorMessage(e, '档案设备列表加载失败，请检查网络'));
        setArchives([]);
      })
      .finally(() => setLoadingArchives(false));
  }, []);

  const preArchive = searchParams.get('archiveId') || searchParams.get('deviceId') || '';
  useEffect(() => {
    if (!preArchive || archives.length === 0) return;
    const hit = archives.find((a) => a.id === preArchive || a.sn === preArchive);
    if (!hit) return;
    setArchiveId(hit.id);
    setDeviceName(hit.name);
    if (HK_TYPES.some((t) => t.value === hit.type)) setCategory(hit.type);
  }, [preArchive, archives]);

  const onSave = async () => {
    if (!archiveId) {
      toastError('请选择档案设备', '须先在「入库管理」完成建档并提交入库');
      return;
    }
    const arch = archives.find((a) => a.id === archiveId);
    if (arch?.sn && ctwingDeviceId.trim() && arch.sn !== ctwingDeviceId.trim()) {
      toastError('设备 ID 不一致', `档案 SN 为「${arch.sn}」，与 CTWing 设备 ID 不一致；请与天翼平台保持一致或修改档案 SN。`);
      return;
    }
    setSaving(true);
    try {
      const body = buildCtwingIotBody({
        archiveDeviceId: archiveId,
        deviceName,
        category,
        productId,
        ctwingDeviceId,
        ctwingPassword,
        broker,
        keepalive,
        thresholdsJson,
        imei,
      });
      await iotService.create(body as never);
      success('已保存', 'CTWing MQTT 接入参数已写入，请在天翼平台核对上报地址与签名');
    } catch (e: unknown) {
      toastError('保存失败', getErrorMessage(e, '请检查网络或接口返回'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/device/access"
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-3 h-3" /> 返回设备接入
        </Link>
      </div>
      <DeviceManagementFlowHint active="access" />

      <div className="glass rounded-xl p-4 border border-slate-600/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <Radio className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100">CTWing 海康4G 接入配置</h1>
            <p className="text-[10px] text-slate-500">
              天翼物联网 MQTT 参数与平台侧解析阈值在此维护；档案主数据仍在「入库管理」。CTWing 设备 ID 建议与档案「出厂序列号(SN)」一致。
            </p>
          </div>
        </div>

        {loadingArchives ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载档案列表…
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">关联档案设备 *</label>
              <select
                value={archiveId}
                onChange={(e) => {
                  const id = e.target.value;
                  setArchiveId(id);
                  const a = archives.find((x) => x.id === id);
                  if (a) {
                    setDeviceName(a.name);
                    if (HK_TYPES.some((t) => t.value === a.type)) setCategory(a.type);
                    if (a.sn) setCtwingDeviceId(a.sn);
                  }
                }}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="">请选择（须已入库）</option>
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · SN {a.sn || '—'} · {a.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">设备类型 *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                >
                  {HK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">展示名称</label>
                <input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-3 mt-2 space-y-3">
              <p className="text-[10px] text-slate-500 font-medium text-purple-300/90">天翼 CTWing / MQTT</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">产品 ID *</label>
                  <input value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">设备 ID（CTWing）*</label>
                  <input value={ctwingDeviceId} onChange={(e) => setCtwingDeviceId(e.target.value)} placeholder="与天翼平台一致" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">特征串 / 密码 *</label>
                <input type="password" value={ctwingPassword} onChange={(e) => setCtwingPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">MQTT 接入地址 *</label>
                  <input value={broker} onChange={(e) => setBroker(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">保活时间（秒）</label>
                  <input type="number" value={keepalive} onChange={(e) => setKeepalive(parseInt(e.target.value, 10) || 120)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">IMEI（可选）</label>
                <input value={imei} onChange={(e) => setImei(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">告警阈值 JSON</label>
                <textarea
                  rows={6}
                  value={thresholdsJson}
                  onChange={(e) => setThresholdsJson(e.target.value)}
                  className="w-full font-mono text-[11px] bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={saving || !archiveId}
                onClick={() => void onSave()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                保存接入配置
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
