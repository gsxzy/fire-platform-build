import { api as httpApi, raw, paginatedQuery } from '../client';
import type { QueryParams, IoTDevice } from '@/types/db';
import { createService } from './core';

export const iotService = {
  ...createService<IoTDevice>('/iot-devices'),
  list: (params: QueryParams = {}) => paginatedQuery<IoTDevice>(`/iot/devices`, params),
  listLegacy: (params: QueryParams = {}) => paginatedQuery<IoTDevice>(`/iot-devices/list`, params),
  getStats: () => httpApi.get<{ total: number; online: number; offline: number; fault: number }>('/iot-devices/stats'),

  protocolList: () => raw.get<unknown[]>('/iot/protocols'),
  createProtocol: (data: unknown) => raw.post<unknown>('/iot/protocols', data),
  updateProtocol: (id: number, data: unknown) => raw.put<unknown>(`/iot/protocols/${id}`, data),
  deleteProtocol: (id: number) => raw.delete<unknown>(`/iot/protocols/${id}`),

  pipelineList: () => raw.get<unknown[]>('/iot/pipelines'),
  createPipeline: (data: unknown) => raw.post<unknown>('/iot/pipelines', data),
};
