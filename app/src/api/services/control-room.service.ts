import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, ControlRoomConfig, HostDeviceCode } from '@/types/db';
import { createService } from './core';

export const hostDeviceCodeService = {
  list: (params: QueryParams = {}) => paginatedQuery<HostDeviceCode>('/control-rooms/host-device-codes', params),
  create: (data: Omit<HostDeviceCode, 'id'>) => httpApi.post<null>('/control-rooms/host-device-codes', data),
  update: (id: string, data: Partial<HostDeviceCode>) => httpApi.put<null>(`/control-rooms/host-device-codes/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/control-rooms/host-device-codes/${id}`),
  import: (hostId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('hostId', hostId);
    return httpApi.post<null>('/control-rooms/host-device-codes/import', form);
  },
};

export const controlRoomConfigService = {
  ...createService<ControlRoomConfig>('/control-room-configs'),
  getByUnit: (unitId: string) => httpApi.get<ControlRoomConfig | null>(`/control-rooms/config/${unitId}`),
  listAll: () => httpApi.get<ControlRoomConfig[]>('/control-rooms/config'),
};
