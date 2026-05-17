import { useState } from 'react';
import PageTemplate from '@/sections/PageTemplate';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { deviceService } from '@/api/services';
import { Cpu } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import type { QueryParams, Device } from '@/types/db';
import { useToast } from '@/core/ToastContext';
import { getErrorMessage } from '@/types/api';

const typeMap: Record<string, string> = {
  detector: '探测器',
  button: '手报',
  pump: '消防泵',
  fan: '风机',
  sensor: '传感器',
  monitor: '监控器',
  controller: '控制器',
  alarm: '报警器',
  host: '报警主机',
  elevator: '电梯',
  broadcast: '广播',
  camera: '摄像头',
  'gb28181-camera': 'GB28181摄像头',
  'fire-controller': '火灾报警控制器',
  water: '水源监测',
  electrical: '电气火灾',
  'smoke-exhaust': '防排烟',
  lighting: '应急照明',
  'iot-sensor': 'IoT传感器',
  'elec-monitor': '电气监测',
  'pressure-sensor': '压力传感器',
  'fan-controller': '风机控制',
  'level-sensor': '液位传感器',
  'user-transmission-device': '用户信息传输装置',
};

const archiveStatusMap: Record<string, string> = {
  draft: '草稿',
  registered: '已入库',
  accessed: '已接入',
  assigned: '已分配',
  maintenance: '维护中',
  scrapped: '报废',
};

const archiveStatusColorMap: Record<string, string> = {
  draft: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  registered: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  accessed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  assigned: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  maintenance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  scrapped: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const onlineStatusMap: Record<string, string> = {
  online: '在线',
  offline: '离线',
  unknown: '未知',
  '0': '离线',
  '1': '在线',
};

const typeColorMap: Record<string, string> = {
  detector: 'text-red-400 bg-red-500/10 border-red-500/20',
  button: 'text-red-400 bg-red-500/10 border-red-500/20',
  alarm: 'text-red-400 bg-red-500/10 border-red-500/20',
  host: 'text-red-400 bg-red-500/10 border-red-500/20',
  'fire-controller': 'text-red-400 bg-red-500/10 border-red-500/20',
  pump: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  water: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  sensor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'level-sensor': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'pressure-sensor': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  fan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'smoke-exhaust': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  monitor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  electrical: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'elec-monitor': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  camera: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'gb28181-camera': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  controller: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  lighting: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  broadcast: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  elevator: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'iot-sensor': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'fan-controller': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'user-transmission-device': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const onlineStatusColorMap: Record<string, string> = {
  online: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  unknown: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '0': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const COLUMNS = [
  { key: 'deviceNo', label: '设备编号', width: '110px' },
  { key: 'id', label: '档案ID', width: '72px' },
  { key: 'name', label: '设备名称', width: '160px' },
  { key: 'type', label: '设备类型', width: '120px', render: (v: unknown) => {
    const type = String(v);
    const label = typeMap[type] || type;
    const style = typeColorMap[type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
  { key: 'archiveStatus', label: '档案状态', width: '90px', render: (v: unknown) => {
    const status = String(v);
    const label = archiveStatusMap[status] || status;
    const style = archiveStatusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
  { key: 'unitName', label: '所属单位', width: '160px' },
  { key: 'manufacturer', label: '生产厂家', width: '100px' },
  { key: 'location', label: '安装位置', width: '130px' },
  { key: 'ip', label: 'IP地址', width: '110px' },
  { key: 'warrantyExpire', label: '质保到期', width: '95px' },
  { key: 'maintenanceExpire', label: '维保到期', width: '95px' },
  { key: 'onlineStatus', label: '在线状态', width: '80px', render: (v: unknown) => {
    const s = String(v);
    const label = onlineStatusMap[s] || s;
    const style = onlineStatusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
];

const FIELDS = [
  { key: 'name', label: '设备名称', type: 'text' as const, required: true },
  { key: 'type', label: '设备类型', type: 'select' as const, required: true, options: [
    { label: '报警主机', value: 'host' },
    { label: '探测器', value: 'detector' },
    { label: '手报', value: 'button' },
    { label: '消防泵', value: 'pump' },
    { label: '风机', value: 'fan' },
    { label: '监控器', value: 'monitor' },
    { label: '传感器', value: 'sensor' },
    { label: '报警器', value: 'alarm' },
    { label: '控制器', value: 'controller' },
    { label: '电梯', value: 'elevator' },
    { label: '广播', value: 'broadcast' },
    { label: '摄像头', value: 'camera' },
    { label: 'GB28181摄像头', value: 'gb28181-camera' },
    { label: '火灾报警控制器', value: 'fire-controller' },
    { label: '水源监测', value: 'water' },
    { label: '电气火灾', value: 'electrical' },
    { label: '防排烟', value: 'smoke-exhaust' },
    { label: '应急照明', value: 'lighting' },
    { label: 'IoT传感器', value: 'iot-sensor' },
    { label: '电气监测', value: 'elec-monitor' },
    { label: '压力传感器', value: 'pressure-sensor' },
    { label: '风机控制', value: 'fan-controller' },
    { label: '液位传感器', value: 'level-sensor' },
    { label: '用户信息传输装置', value: 'user-transmission-device' },
  ]},
  { key: 'protocolType', label: '协议类型', type: 'select' as const, options: [
    { label: '标准协议', value: 'standard' },
    { label: 'GB26875', value: 'gb26875' },
    { label: '赋安FSCN8001', value: 'fscn8001' },
  ]},
  { key: 'gatewayId', label: '传输装置ID', type: 'text' as const },
  { key: 'manufacturer', label: '生产厂家', type: 'text' as const },
  { key: 'model', label: '设备型号', type: 'text' as const },
  { key: 'serialNo', label: '出厂序列号(SN)', type: 'text' as const, required: true },
  { key: 'productionDate', label: '生产日期', type: 'date' as const },
  { key: 'installDate', label: '安装日期', type: 'date' as const },
  { key: 'warrantyPeriod', label: '质保期(月)', type: 'number' as const },
  { key: 'warrantyExpire', label: '质保到期日', type: 'date' as const },
  { key: 'maintenanceExpire', label: '维保到期日', type: 'date' as const },
  { key: 'calibrationCycle', label: '校准周期(月)', type: 'number' as const },
  { key: 'scrapYear', label: '报废年限(年)', type: 'number' as const },
  { key: 'location', label: '安装位置', type: 'text' as const },
  { key: 'ip', label: 'IP地址', type: 'text' as const },
  { key: 'remark', label: '备注', type: 'textarea' as const },
];

const FILTER_FIELDS = [
  {
    key: 'type',
    label: '设备类型',
    options: [
      { label: '报警主机', value: 'host' },
      { label: '探测器', value: 'detector' },
      { label: '手报', value: 'button' },
      { label: '消防泵', value: 'pump' },
      { label: '风机', value: 'fan' },
      { label: '监控器', value: 'monitor' },
      { label: '传感器', value: 'sensor' },
      { label: '报警器', value: 'alarm' },
      { label: '控制器', value: 'controller' },
      { label: '电梯', value: 'elevator' },
      { label: '广播', value: 'broadcast' },
      { label: '摄像头', value: 'camera' },
      { label: 'GB28181摄像头', value: 'gb28181-camera' },
      { label: '火灾报警控制器', value: 'fire-controller' },
      { label: '水源监测', value: 'water' },
      { label: '电气火灾', value: 'electrical' },
      { label: '防排烟', value: 'smoke-exhaust' },
      { label: '应急照明', value: 'lighting' },
      { label: 'IoT传感器', value: 'iot-sensor' },
      { label: '电气监测', value: 'elec-monitor' },
      { label: '压力传感器', value: 'pressure-sensor' },
      { label: '风机控制', value: 'fan-controller' },
      { label: '液位传感器', value: 'level-sensor' },
      { label: '用户信息传输装置', value: 'user-transmission-device' },
    ],
  },
  {
    key: 'lifecycleStatus',
    label: '流程状态',
    options: [
      { label: '草稿', value: '0' },
      { label: '已入库', value: '1' },
      { label: '已接入', value: '2' },
      { label: '已分配', value: '3' },
      { label: '维护中', value: '4' },
      { label: '报废', value: '5' },
    ],
  },
];

function mapLifecycleToArchiveStatus(ls: number | undefined): NonNullable<Device['archiveStatus']> {
  const n = ls ?? 1;
  if (n >= 5) return 'scrapped';
  if (n === 4) return 'maintenance';
  if (n === 3) return 'assigned';
  if (n === 2) return 'accessed';
  if (n === 1) return 'registered';
  if (n === 0) return 'draft';
  return 'registered';
}

/* ── 将后端 fire_device snake_case → 前端 Device ── */
function mapBackendDeviceToDevice(raw: any): Device {
  const statusNumMap: Record<number, string> = { 0: 'disabled', 1: 'normal', 2: 'fault', 3: 'offline', 4: 'scrapped' };
  const st = raw.status;
  const statusStr =
    typeof st === 'number' ? (statusNumMap[st] ?? 'offline') : (st ?? 'offline');
  const uid = raw.unit_id ?? raw.unitId ?? raw.unit?.id;
  const unitIdStr = uid != null && uid !== '' && uid !== '0' ? String(uid) : '';
  const lifecycle = Number(raw.lifecycle_status ?? raw.lifecycleStatus ?? 1) || 1;
  const fallbackUnitName = unitIdStr ? `单位ID:${unitIdStr}` : '';
  return {
    id: String(raw.id ?? ''),
    deviceNo: String(raw.device_no ?? ''),
    name: raw.device_name ?? raw.name ?? '',
    type: raw.device_type ?? raw.type ?? '',
    model: raw.device_model ?? raw.model ?? '',
    manufacturer: raw.manufacturer ?? '',
    unitId: unitIdStr,
    unitName: raw.unit?.unit_name ?? raw.unit_name ?? raw.unitName ?? fallbackUnitName,
    location: raw.install_location ?? raw.location ?? '',
    ip: raw.iot_id ?? raw.ip ?? '',
    status: statusStr as Device['status'],
    onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
    installDate: raw.install_date ?? raw.installDate ?? '',
    productionDate: raw.production_date ?? raw.productionDate ?? '',
    warrantyPeriod: raw.warranty_period ?? raw.warrantyPeriod ?? undefined,
    warrantyExpire: raw.warranty_expire ?? raw.warrantyExpire ?? '',
    maintenanceExpire: raw.maintenance_expire ?? raw.maintenanceExpire ?? '',
    firmware: raw.firmware ?? '',
    remark: raw.remark ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
    lifecycleStatus: lifecycle,
    archiveStatus: mapLifecycleToArchiveStatus(lifecycle),
    hasIotConfig: !!raw.has_iot_config,
  } as Device;
}

/* ── 前端 Device → 后端 fire_device 字段映射 ── */
function mapDeviceToBackend(data: Partial<Device>): any {
  const base: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    device_model: data.model,
    manufacturer: data.manufacturer,
    serialNo: data.serialNo,
    productionDate: data.productionDate,
    installDate: data.installDate,
    warrantyPeriod: data.warrantyPeriod,
    warrantyExpire: data.warrantyExpire,
    maintenanceExpire: data.maintenanceExpire,
    calibrationCycle: data.calibrationCycle,
    scrapYear: data.scrapYear,
    location: data.location,
    ip: data.ip,
    remark: data.remark,
    protocolType: data.protocolType,
    gatewayId: data.gatewayId,
    status: data.status,
  };
  /* 入库管理编辑表单不含 unitId，禁止默认传空字符串导致后端误判为解绑 */
  if (data.unitId !== undefined && data.unitId !== null && data.unitId !== '') {
    base.unitId = data.unitId;
  }
  if (data.lifecycleStatus !== undefined && data.lifecycleStatus !== null) {
    base.lifecycleStatus = data.lifecycleStatus;
  }
  return base;
}

const archiveService = {
  async list(params: QueryParams) {
    const q: QueryParams = { ...params };
    if ((q as any).archive_status) {
      const mapOld: Record<string, string> = {
        draft: '0',
        unallocated: '1',
        allocated: '3',
        accessed: '2',
        scrapped: '5',
      };
      const v = String((q as any).archive_status);
      if (mapOld[v]) (q as any).lifecycleStatus = mapOld[v];
      delete (q as any).archive_status;
    }
    const deviceRes = await deviceService.list(q);
    if (deviceRes.code !== 200 || !deviceRes.data?.list) return deviceRes as any;
    const list = ((deviceRes.data.list as any[]) || []).map(mapBackendDeviceToDevice);
    return {
      ...deviceRes,
      data: {
        ...deviceRes.data,
        list,
      },
    };
  },
  create: async (data: Partial<Device>) => {
    const payload = mapDeviceToBackend(data) as Record<string, unknown>;
    payload.onlineStatus = 'offline';
    /* 新建默认为草稿，需「提交入库」后进入已入库，方可设备接入 */
    payload.lifecycleStatus = 0;
    return deviceService.create(payload as any);
  },
  update: async (id: string, data: Partial<Device>) => {
    const payload = mapDeviceToBackend(data);
    return deviceService.update(id, payload as any);
  },
  delete: async (id: string) => deviceService.delete(id),
};

export default function DeviceArchivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [listTick, setListTick] = useState(0);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const seedKeyword = searchParams.get('keyword') || searchParams.get('deviceId') || '';
  return (
    <PageTemplate
      key={listTick}
      title="入库管理"
      icon={Cpu}
      badge="设备档案台账"
      badgeColor="text-slate-300 bg-slate-500/10 border-slate-500/25"
      columns={COLUMNS}
      service={archiveService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      initialKeyword={seedKeyword}
      addable
      actions
      batchable
      formInitialDefaults={{ protocolType: 'standard' }}
      showIndex
      extraHeaderActions={<DeviceManagementFlowHint active="archive" />}
      renderExtraActions={(row: any) => {
        if (row.archiveStatus === 'draft') {
          return (
            <button
              type="button"
              disabled={submittingId === String(row.id)}
              onClick={async () => {
                const id = String(row.id);
                setSubmittingId(id);
                try {
                  const res = await deviceService.update(id, { lifecycleStatus: 1 });
                  if (res.code !== 200) {
                    toastError('提交失败', (res as { msg?: string }).msg || '请重试');
                    return;
                  }
                  success('已入库', '可前往「设备接入」完成协议与网络配置');
                  setListTick((t) => t + 1);
                } catch (e: unknown) {
                  toastError('提交失败', getErrorMessage(e, '请检查网络'));
                } finally {
                  setSubmittingId(null);
                }
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/25 transition-colors disabled:opacity-50"
              title="将草稿转为已入库后，方可进行平台接入"
            >
              {submittingId === String(row.id) ? '提交中…' : '提交入库'}
            </button>
          );
        }
        if (row.archiveStatus === 'registered') {
          return (
            <button
              onClick={() => navigate(`/device/access?deviceId=${row.id}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              title="平台接入（协议/网络）"
            >
              去接入
            </button>
          );
        }
        if (row.archiveStatus === 'accessed') {
          // 已接入但实际已有单位 → 显示已分配标签
          if (row.unitId) {
            return (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                已分配
              </span>
            );
          }
          return (
            <button
              onClick={() => navigate(`/device/allocate?deviceId=${row.id}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
              title="绑定单位/项目"
            >
              去分配
            </button>
          );
        }
        if (row.archiveStatus === 'assigned') {
          return (
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title="已完成平台接入">
                已接入
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20" title="已完成单位分配">
                已分配
              </span>
              <button
                onClick={() => navigate(`/device/config?keyword=${encodeURIComponent(row.deviceNo || row.id)}`)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20 transition-colors"
                title="业务参数（阈值、联动等）"
              >
                去配置
              </button>
              <button
                type="button"
                onClick={() => navigate(`/device/maintain?deviceId=${encodeURIComponent(row.id)}`)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 border border-amber-500/25 transition-colors"
                title="登记或查看该设备的维保/巡检记录"
              >
                去维护
              </button>
            </div>
          );
        }
        return null;
      }}
      emptyDescription="此处为全平台设备唯一源头：新增默认为「草稿」，核对 SN/型号后点「提交入库」进入「已入库」，再依次完成「设备接入」→「设备分配」→「设备配置」。禁止从接入页凭空创建设备档案。"
    />
  );
}
