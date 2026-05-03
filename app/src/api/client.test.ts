import { describe, it, expect } from 'vitest';
import { api, raw, createCancelableRequest, buildUrl } from './client';

/* ═══════════════════════════════════════════════════════════════════
   API Client 基础单元测试
   ═══════════════════════════════════════════════════════════════════ */

describe('buildUrl', () => {
  it('returns url as-is when no params', () => {
    const result = (buildUrl as any)('/units');
    expect(result).toBe('/units');
  });

  it('appends query string with params', () => {
    const result = (buildUrl as any)('/units', { page: 1, size: 10 });
    expect(result).toBe('/units?page=1&size=10');
  });

  it('skips undefined/null values', () => {
    const result = (buildUrl as any)('/units', { page: 1, keyword: undefined, status: null });
    expect(result).toBe('/units?page=1');
  });
});

describe('createCancelableRequest', () => {
  it('returns promise and cancel function', () => {
    const { promise, cancel } = createCancelableRequest(async (signal) => {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => resolve('ok'), 1000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        });
      });
    });

    expect(promise).toBeInstanceOf(Promise);
    expect(typeof cancel).toBe('function');
  });

  it('can cancel the request', async () => {
    const { promise, cancel } = createCancelableRequest(async (signal) => {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => resolve('ok'), 1000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    cancel();
    await expect(promise).rejects.toThrow('Aborted');
  });
});

describe('api object shape', () => {
  it('has get/post/put/patch/delete methods', () => {
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.delete).toBe('function');
  });
});

describe('raw object shape', () => {
  it('has get/post/put/patch/delete methods', () => {
    expect(typeof raw.get).toBe('function');
    expect(typeof raw.post).toBe('function');
    expect(typeof raw.put).toBe('function');
    expect(typeof raw.patch).toBe('function');
    expect(typeof raw.delete).toBe('function');
  });
});
