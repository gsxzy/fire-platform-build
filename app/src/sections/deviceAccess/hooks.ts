import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useToast } from '@/core/ToastContext';
import { iotService, deviceService } from '@/api/services';
import { logger } from '@/lib/logger';
import type { Device } from '@/types/db';
import type { IoTDevice } from './types';
import { extractIotList, mapRowToIoTDevice, buildIotCreateBody } from './utils';

export interface AddFormState {
  archiveDeviceId: string;
  deviceName: string;
  category: string;
  protocol: string;
  ip: string;
  port: string;
  imei: string;
  unitId: string;
  unitName: string;
  floor: string;
  room: string;
  heartbeatInterval: number;
  registerCount: number;
  manufacturer: string;
  model: string;
  firmware: string;
  productionDate: string;
  installDate: string;
  warrantyPeriod: string;
  warrantyExpire: string;
  maintenanceExpire: string;
  productId: string;
  ctwingDeviceId: string;
  ctwingPassword: string;
  broker: string;
  keepalive: number;
  thresholds: string;
  hostDeviceId: string;
  hostDeviceSn: string;
  txDeviceId: string;
  txDeviceSn: string;
}

const initialAddForm: AddFormState = {
  archiveDeviceId: '', deviceName: '', category: 'fire-controller', protocol: 'Modbus TCP',
  ip: '', port: '502', imei: '', unitId: '', unitName: '',
  floor: '1F', room: '', heartbeatInterval: 30, registerCount: 10,
  manufacturer: '', model: '', firmware: '',
  productionDate: '', installDate: '', warrantyPeriod: '', warrantyExpire: '', maintenanceExpire: '',
  productId: '2000614607', ctwingDeviceId: '', ctwingPassword: '',
  broker: '2000614607.non-nb.ctwing.cn', keepalive: 120, thresholds: '',
  hostDeviceId: '', hostDeviceSn: '', txDeviceId: '', txDeviceSn: '',
};

export function useDeviceAccess() {
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'topology' | 'guide'>('list');
  const [listLoading, setListLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [archiveDevices, setArchiveDevices] = useState<(Device & { archiveId: string; gatewayId: string })[]>([]);
  const [addForm, setAddForm] = useState<AddFormState>(initialAddForm);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadDevices = useCallback(async () => {
    setListLoading(true);
    try {
      const statusApi =
        statusFilter === 'online' ? 1
        : statusFilter === 'offline' ? 0
        : statusFilter === 'fault' ? 2
        : undefined;
      const res = await iotService.list({
        pageNum: 1, pageSize: 500,
        keyword: debouncedSearch || undefined,
        protocolType: protocolFilter === 'all' ? undefined : protocolFilter,
        deviceType: catFilter === 'all' ? undefined : catFilter,
        status: statusApi !== undefined ? statusApi : undefined,
      });
      const rows = extractIotList(res as { data?: unknown }).map(mapRowToIoTDevice);
      setDevices(rows);
      setLastSyncAt(new Date());
    } catch {
      setDevices([]);
      toastError('加载失败', '无法获取 IoT 设备列表，请检查网络与登录状态');
    } finally { setListLoading(false); }
  }, [toastError, debouncedSearch, protocolFilter, catFilter, statusFilter]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  useEffect(() => {
    deviceService.list({ pageSize: 999, lifecycleStatus: '1,2,3' }).then((res: any) => {
      const rows = res.data?.list || [];
      setArchiveDevices(rows.map((raw: any) => ({
        archiveId: String(raw.id ?? ''),
        id: String(raw.id ?? ''),
        deviceNo: String(raw.device_no ?? ''),
        name: raw.device_name ?? raw.name ?? '',
        type: raw.device_type ?? raw.type ?? '',
        model: raw.device_model ?? raw.model ?? '',
        manufacturer: raw.manufacturer ?? '',
        unitId: raw.unit_id != null ? String(raw.unit_id) : '',
        unitName: raw.unit_name ?? raw.unitName ?? '',
        location: raw.install_location ?? raw.location ?? '',
        status: String(raw.status ?? ''),
        onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
        ip: raw.iot_id ?? raw.ip ?? '',
        firmware: raw.firmware ?? '',
        installDate: raw.install_date ?? raw.installDate ?? '',
        createdAt: raw.created_at ?? raw.createdAt ?? '',
        updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
        gatewayId: raw.gateway_id ?? raw.gatewayId ?? '',
      })) as (Device & { archiveId: string; gatewayId: string })[]);
    }).catch(() => {});
  }, []);

  const pendingDeviceId = searchParams.get('deviceId');
  useEffect(() => {
    if (!pendingDeviceId || archiveDevices.length === 0) return;
    const d = archiveDevices.find((x) => x.archiveId === pendingDeviceId || x.id === pendingDeviceId || x.deviceNo === pendingDeviceId);
    if (!d) return;
    setAddForm((prev) => ({
      ...prev,
      archiveDeviceId: d.archiveId,
      deviceName: d.name,
      unitId: d.unitId || '',
      unitName: d.unitName || '',
      category: (d.type || 'fire-controller') as any,
      manufacturer: d.manufacturer || '',
      model: d.model || '',
      firmware: d.firmware || '',
    }));
    setEditingDbId(null);
    setShowAddModal(true);
  }, [pendingDeviceId, archiveDevices]);

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    fault: devices.filter(d => d.status === 'fault').length,
    warning: devices.filter(d => d.status === 'warning').length,
    bound: devices.filter(d => d.isBound).length,
    totalPoints: devices.reduce((s, d) => s + d.dataPoints, 0),
  };

  const refreshArchiveDevices = useCallback(() => {
    deviceService.list({ pageSize: 999, lifecycleStatus: '1,2,3' }).then((res: any) => {
      const rows = res.data?.list || [];
      setArchiveDevices(rows.map((raw: any) => ({
        archiveId: String(raw.id ?? ''), id: String(raw.id ?? ''),
        deviceNo: String(raw.device_no ?? ''),
        name: raw.device_name ?? raw.name ?? '',
        type: raw.device_type ?? raw.type ?? '',
        model: raw.device_model ?? raw.model ?? '',
        manufacturer: raw.manufacturer ?? '',
        unitId: raw.unit_id != null ? String(raw.unit_id) : '',
        unitName: raw.unit_name ?? raw.unitName ?? '',
        location: raw.install_location ?? raw.location ?? '',
        status: String(raw.status ?? ''),
        onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
        ip: raw.iot_id ?? raw.ip ?? '',
        firmware: raw.firmware ?? '',
        installDate: raw.install_date ?? raw.installDate ?? '',
        createdAt: raw.created_at ?? raw.createdAt ?? '',
        updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
        gatewayId: raw.gateway_id ?? raw.gatewayId ?? '',
      })) as (Device & { archiveId: string; gatewayId: string })[]);
    }).catch(() => {});
  }, []);

  const submitAccess = useCallback(async () => {
    if (!addForm.archiveDeviceId) return;
    const iotData = buildIotCreateBody(addForm);
    try {
      if (editingDbId) {
        await iotService.update(editingDbId, iotData as any);
        success('已保存', `${iotData.name} 接入参数已更新`);
      } else {
        await iotService.create(iotData as any);
        success('设备接入成功', `${iotData.name} 已完成平台接入`);
      }
      /* FSCN8001 自动关联 */
      if (!editingDbId) {
        const currentDev = archiveDevices.find((x) => x.archiveId === addForm.archiveDeviceId);
        const currentSn = currentDev?.deviceNo || currentDev?.id || '';
        if (addForm.hostDeviceId && addForm.hostDeviceId !== '' && currentSn) {
          try {
            await deviceService.update(addForm.hostDeviceId, { gatewayId: currentSn });
            logger?.info?.(`[FSCN8001] 自动关联：主机(${addForm.hostDeviceId}) 关联网关 → ${currentSn}`);
          } catch (e: unknown) {
            logger?.warn?.(`[FSCN8001] 自动关联主机失败: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        if (addForm.txDeviceId && addForm.txDeviceId !== '' && addForm.txDeviceSn) {
          try {
            await deviceService.update(addForm.archiveDeviceId, { gatewayId: addForm.txDeviceSn });
            logger?.info?.(`[FSCN8001] 自动关联：主机(${addForm.archiveDeviceId}) 关联网关 → ${addForm.txDeviceSn}`);
          } catch (e: unknown) {
            logger?.warn?.(`[FSCN8001] 自动关联主机失败: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
      await loadDevices();
      refreshArchiveDevices();
      setShowAddModal(false);
      setEditingDbId(null);
      setAddForm(initialAddForm);
      setSelectedDevice(null);
    } catch (e: unknown) {
      toastError(editingDbId ? '保存失败' : '接入失败', e instanceof Error ? e.message : '网络或服务器异常');
    }
  }, [addForm, editingDbId, archiveDevices, loadDevices, refreshArchiveDevices, success, toastError]);

  const deleteAccess = useCallback(async (device: IoTDevice) => {
    if (!window.confirm(`确定从接入表移除「${device.name}」？不会删除设备档案。`)) return;
    try {
      await iotService.delete(device.dbId);
      success('已移除接入', device.name);
      setSelectedDevice(null);
      await loadDevices();
      refreshArchiveDevices();
    } catch (e: unknown) {
      toastError('删除失败', e instanceof Error ? e.message : '请稍后重试');
    }
  }, [loadDevices, refreshArchiveDevices, success, toastError]);

  return {
    devices, setDevices,
    search, setSearch,
    debouncedSearch,
    catFilter, setCatFilter,
    statusFilter, setStatusFilter,
    protocolFilter, setProtocolFilter,
    selectedDevice, setSelectedDevice,
    activeTab, setActiveTab,
    listLoading, setListLoading,
    lastSyncAt, setLastSyncAt,
    showAddModal, setShowAddModal,
    editingDbId, setEditingDbId,
    archiveDevices, setArchiveDevices,
    addForm, setAddForm,
    loadDevices,
    stats,
    refreshArchiveDevices,
    initialAddForm,
    submitAccess,
    deleteAccess,
    success, toastError,
  };
}
