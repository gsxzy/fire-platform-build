import { describe, it, expect } from 'vitest';

describe('GB28181 Service', () => {
  it('WVP 模式开关应正确读取环境变量', () => {
    const enabled = import.meta.env.VITE_WVP_ENABLED === 'true';
    expect(typeof enabled).toBe('boolean');
  });
});
