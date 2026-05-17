/**
 * ═══════════════════════════════════════════════════════════════════
 * GB28181 国标设备服务（含 WVP 模式本地预配置）
 * ═══════════════════════════════════════════════════════════════════
 */
import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, GB28181Device, SIPServerConfig } from '@/types/db';
import * as wvp from '@/services/wvpService';
import * as videoApi from '../videoService';
import { createService } from './core';

const WVP_ENABLED = import.meta.env.VITE_WVP_ENABLED === 'true';

/* ───── WVP 模式下本地预配置设备存储 ───── */
async function saveLocalDevice(data: GB28181Device): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  await GB28181DeviceDAO.create(data);
}

async function deleteLocalDevice(id: string): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  await GB28181DeviceDAO.delete(id);
}

async function updateLocalDevice(id: string, data: Partial<GB28181Device>): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  const existing = await GB28181DeviceDAO.getById(id);
  if (existing) {
    await GB28181DeviceDAO.update(id, data);
  } else {
    const record: GB28181Device = {
      id,
      deviceId: data.deviceId || id,
      name: data.name || '',
      manufacturer: data.manufacturer || '',
      model: data.model || '',
      firmware: data.firmware || '',
      ip: data.ip || '',
      port: Number(data.port) || 5060,
      transport: data.transport === 'TCP' ? 'TCP' : 'UDP',
      username: data.username || '',
      password: data.password || '',
      status: (data.status as GB28181Device['status']) || 'offline',
      registerTime: data.registerTime || '',
      lastKeepalive: data.lastKeepalive || '',
      channelCount: data.channelCount ?? 0,
      channels: data.channels ?? [],
      catalogSynced: data.catalogSynced ?? false,
      ptzSupport: data.ptzSupport ?? true,
      unitId: data.unitId || '',
      unitName: data.unitName || '',
      location: data.location || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocal: true,
    };
    await GB28181DeviceDAO.create(record);
  }
}

/* ───── WVP 设备数据映射 ───── */
function mapWvpDeviceToGb(d: wvp.WvpDevice): GB28181Device {
  return {
    id: String(d.id),
    deviceId: d.deviceId,
    name: d.name || d.deviceId,
    manufacturer: d.manufacturer || '',
    model: d.model || '',
    firmware: d.firmware || '',
    ip: d.ip || '',
    port: d.port || 5060,
    transport: (d.transport?.toUpperCase() as 'UDP' | 'TCP') || 'UDP',
    username: d.deviceId,
    password: d.password || '',
    status: d.onLine ? 'online' : 'offline',
    registerTime: d.registerTime || d.createTime || '',
    lastKeepalive: d.keepaliveTime || d.updateTime || '',
    channelCount: d.channelCount || 0,
    channels: [],
    catalogSynced: (d.channelCount || 0) > 0,
    ptzSupport: true,
    unitId: d.unitId || '',
    unitName: d.unitName || '',
    location: d.hostAddress || d.ip || '',
    createdAt: d.createTime || '',
    updatedAt: d.updateTime || '',
  };
}

function channelLooksOnline(status: unknown): boolean {
  if (status === true || status === 1) return true;
  const t = String(status ?? '').trim().toLowerCase();
  return ['on', 'online', 'ok', 'live', 'true', '1'].includes(t);
}

function mapWvpChannelToGb(ch: wvp.WvpDeviceChannel): import('@/types/db').GB28181Channel {
  const cid = ch.channelId || ch.deviceId || String(ch.id);
  return {
    channelId: cid,
    name: ch.name || cid,
    status: channelLooksOnline(ch.status) ? 'on' : 'off',
    streamUrl: undefined,
    snapUrl: undefined,
  };
}

const _gbChMax = Number(import.meta.env.VITE_GB28181_MAX_CHANNELS_PER_DEVICE);
const GB28181_MAX_CHANNELS_PER_DEVICE = Math.max(
  4,
  Math.min(64, Number.isFinite(_gbChMax) && _gbChMax > 0 ? _gbChMax : 16),
);

function enrichLocalGbForList(raw: Partial<GB28181Device> & { id: string }): GB28181Device {
  const st = raw.status as GB28181Device['status'] | undefined;
  const status: GB28181Device['status'] =
    st === 'online' || st === 'offline' || st === 'registering' || st === 'fault' ? st : 'offline';
  return {
    id: raw.id,
    deviceId: raw.deviceId || '',
    name: raw.name || raw.deviceId || '未命名设备',
    manufacturer: raw.manufacturer || '',
    model: raw.model || '',
    firmware: raw.firmware || '',
    ip: raw.ip || '',
    port: Number(raw.port) || 5060,
    transport: raw.transport === 'TCP' ? 'TCP' : 'UDP',
    username: raw.username,
    password: raw.password,
    status,
    registerTime: raw.registerTime || '',
    lastKeepalive: raw.lastKeepalive || '',
    channelCount: raw.channelCount ?? (raw.channels?.length ?? 0),
    channels: Array.isArray(raw.channels) ? raw.channels : [],
    catalogSynced: !!raw.catalogSynced,
    ptzSupport: raw.ptzSupport !== false,
    unitId: raw.unitId || '',
    unitName: raw.unitName,
    location: raw.location || '',
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    isLocal: true,
  };
}

export const gb28181Service = {
  ...createService<GB28181Device>('/gb28181-devices'),

  list: async (params: QueryParams = {}) => {
    if (WVP_ENABLED) {
      let wvpList: GB28181Device[] = [];
      try {
        const resp = await videoApi.getVideoDevices({ page: Number(params.pageNum || 1), count: Number(params.pageSize || 100), query: params.keyword });
        wvpList = (resp.list || []).map((d: any) => mapWvpDeviceToGb({
          id: d.deviceId,
          deviceId: d.deviceId,
          name: d.name || d.deviceId,
          manufacturer: d.manufacturer || '',
          model: d.model || '',
          firmware: d.firmware || '',
          ip: d.ip || '',
          port: d.port || 5060,
          transport: d.transport || 'UDP',
          onLine: d.onLine !== false,
          registerTime: d.registerTime || d.createTime || '',
          keepaliveTime: d.keepaliveTime || d.updateTime || '',
          channelCount: d.channelCount || 0,
          createTime: d.createTime || '',
          updateTime: d.updateTime || '',
        }));
        for (const d of wvpList) {
          try {
            const chResp = await videoApi.getDeviceChannels(d.deviceId, { count: 999 });
            const rawList = chResp.list || [];
            const seenCh = new Set<string>();
            const channels = rawList
              .map((ch: any) => mapWvpChannelToGb({
                id: ch.id || 0,
                channelId: ch.channelId || ch.deviceId || String(ch.id),
                name: ch.name || ch.channelId || '',
                deviceId: ch.deviceId,
                status: ch.status,
              }))
              .filter((ch) => {
                const k = String(ch.channelId);
                if (!k || seenCh.has(k)) return false;
                seenCh.add(k);
                return true;
              });
            channels.sort((a, b) => String(a.channelId).localeCompare(String(b.channelId), 'en'));
            d.channels = channels.slice(0, GB28181_MAX_CHANNELS_PER_DEVICE);
            d.channelCount = d.channels.length;
            d.catalogSynced = d.channels.length > 0;
          } catch { /* ignore */ }
        }
      } catch { /* WVP 不可用时降级为空列表 */ }

      const wvpDeviceIds = new Set(wvpList.map(d => d.deviceId).filter(Boolean));
      let merged: GB28181Device[] = [...wvpList];
      try {
        const { GB28181DeviceDAO } = await import('@/db/Database');
        const locals = await GB28181DeviceDAO.getAll();
        for (const row of locals) {
          const did = row.deviceId;
          if (did && wvpDeviceIds.has(did)) {
            const idx = merged.findIndex(m => m.deviceId === did);
            if (idx >= 0 && row.unitId) {
              merged[idx] = {
                ...merged[idx],
                unitId: row.unitId,
                unitName: row.unitName || merged[idx].unitName,
                location: row.location || merged[idx].location,
              };
            }
            continue;
          }
          merged.push(enrichLocalGbForList(row));
        }
      } catch { /* IndexedDB 不可用时仍展示 WVP 列表 */ }

      const kw = (params.keyword || '').trim();
      if (kw) {
        merged = merged.filter(
          d => d.name.includes(kw) || d.deviceId.includes(kw) || d.id.includes(kw),
        );
      }

      return {
        code: 200,
        message: 'success',
        data: {
          total: merged.length,
          list: merged,
          pageNum: params.pageNum || 1,
          pageSize: params.pageSize || 100,
        },
      };
    }
    return paginatedQuery<GB28181Device>('/gb28181-devices/list', params);
  },

  get: async (id: string) => {
    if (WVP_ENABLED) {
      const { GB28181DeviceDAO } = await import('@/db/Database');
      const local = await GB28181DeviceDAO.getById(id);
      if (local) {
        return { code: 200, message: 'success', data: enrichLocalGbForList(local as GB28181Device & { id: string }) };
      }
      const devices = (await gb28181Service.list({ pageSize: 2000 })).data?.list || [];
      const found = devices.find(d => d.id === id || d.deviceId === id);
      return { code: 200, message: 'success', data: found || null };
    }
    return httpApi.get<GB28181Device>(`/gb28181-devices/${id}`);
  },

  create: async (data: Omit<GB28181Device, 'id'>) => {
    if (WVP_ENABLED) {
      const incoming = data as GB28181Device & { id?: string };
      const id = incoming.id || `local-${Date.now()}`;
      const localDev: GB28181Device = {
        ...incoming,
        id,
        channels: incoming.channels ?? [],
        catalogSynced: incoming.catalogSynced ?? false,
        registerTime: incoming.registerTime || '',
        lastKeepalive: incoming.lastKeepalive || '',
        isLocal: true,
      };
      await saveLocalDevice(localDev);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.post<null>('/gb28181-devices', data);
  },

  update: async (id: string, data: Partial<GB28181Device>) => {
    if (WVP_ENABLED) {
      await updateLocalDevice(id, data);
      // 同步到后端 MySQL（消控室等场景需要查询 gb28181_devices.unit_id）
      try {
        const deviceId = data.deviceId || id;
        await httpApi.put<null>(`/gb28181-devices/${deviceId}`, data);
      } catch (e) {
        // 后端可能无对应记录，静默忽略
      }
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.put<null>(`/gb28181-devices/${id}`, data);
  },

  delete: async (id: string) => {
    if (WVP_ENABLED) {
      await deleteLocalDevice(id);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.delete<null>(`/gb28181-devices/${id}`);
  },

  syncCatalog: (deviceId: string) => {
    if (WVP_ENABLED) {
      return Promise.resolve({ code: 200, message: 'success', data: null as any });
    }
    return httpApi.post<GB28181Device>(`/gb28181-devices/${deviceId}/sync-catalog`, {});
  },

  getStreamUrl: async (deviceId: string, channelId: string) => {
    if (WVP_ENABLED) {
      let stream: Awaited<ReturnType<typeof videoApi.getStream>> | null = null;
      try {
        stream = await videoApi.getStream(deviceId, channelId);
      } catch {
        stream = null;
      }
      const u = (s: string | undefined) => (s && String(s).trim()) || '';
      if (!stream || typeof stream !== 'object') {
        return { code: 200, message: 'success', data: { deviceId, channelId, streamUrl: '', snapUrl: undefined } };
      }
      const streamUrl =
        u(stream.streamUrl) ||
        u(stream.httpsHls) ||
        u(stream.hls) ||
        u(stream.httpsFlv) ||
        u(stream.flv) ||
        u(stream.wsFlv);
      return {
        code: 200, message: 'success',
        data: { deviceId, channelId, streamUrl, snapUrl: u(stream.wsFlv) || undefined },
      };
    }
    return httpApi.get<{ deviceId: string; channelId: string; streamUrl: string; snapUrl?: string }>(`/gb28181-devices/${deviceId}/channels/${channelId}/stream`);
  },

  ptzControl: async (deviceId: string, channelId: string, cmd: string, speed?: number) => {
    if (WVP_ENABLED) {
      await videoApi.ptzControl(deviceId, channelId, cmd as any, speed);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.post<null>(`/gb28181-devices/${deviceId}/channels/${channelId}/ptz`, { cmd, speed: speed ?? 50 });
  },

  getPlaybackList: async (deviceId: string, channelId: string, startTime: string, endTime: string) => {
    if (WVP_ENABLED) {
      const stream = await videoApi.getPlayback(deviceId, channelId, startTime, endTime);
      return { code: 200, message: 'success', data: [stream] };
    }
    return httpApi.get<any[]>(`/gb28181-devices/${deviceId}/channels/${channelId}/playback?start=${startTime}&end=${endTime}`);
  },
};

export const sipServerService = {
  ...createService<SIPServerConfig>('/sip-server-configs'),
  getStatus: () => httpApi.get<{ running: boolean; port: number; transport: string; registered: number; max: number }>('/sip-server/status'),
  start: () => httpApi.post<null>('/sip-server/start', {}),
  stop: () => httpApi.post<null>('/sip-server/stop', {}),
};
