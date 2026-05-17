import { describe, it, expect } from 'vitest';
import { createService } from '@/api/services/core';

describe('createService', () => {
  it('应返回包含 CRUD 方法的对象', () => {
    const svc = createService<any>('/test');
    expect(typeof svc.list).toBe('function');
    expect(typeof svc.get).toBe('function');
    expect(typeof svc.create).toBe('function');
    expect(typeof svc.update).toBe('function');
    expect(typeof svc.patch).toBe('function');
    expect(typeof svc.delete).toBe('function');
  });
});
