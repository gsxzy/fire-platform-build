/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════
   Vitest 测试环境初始化
   ═══════════════════════════════════════════════════════════════════ */

// Mock localStorage
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  key: (index: number) => Object.keys(storage)[index] ?? null,
  get length() { return Object.keys(storage).length; },
} as unknown as Storage;

// Reset storage before each test
beforeEach(() => {
  localStorage.clear();
});
