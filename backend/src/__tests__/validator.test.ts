import { describe, it, expect, expectFn } from '../test-utils';
import { parseIdStrict, sanitizeBody, sanitizePagination, MAX_PAGE_SIZE } from '@/utils/validator';

describe('Validator Utils', () => {
  it('parseIdStrict 应解析正整数', () => {
    expect(parseIdStrict('123')).toBe(123);
  });

  it('parseIdStrict 对无效ID应抛出异常', () => {
    expectFn(() => parseIdStrict('abc')).toThrow('无效ID');
    expectFn(() => parseIdStrict('0')).toThrow('无效ID');
    expectFn(() => parseIdStrict('-1')).toThrow('无效ID');
  });

  it('sanitizeBody 应过滤 id 字段', () => {
    const result = sanitizeBody({ id: 1, name: 'test', value: 123 });
    expect(result.id).toBe(undefined);
    expect(result.name).toBe('test');
    expect(result.value).toBe(123);
  });

  it('sanitizeBody 对非对象应返回空对象', () => {
    expect(JSON.stringify(sanitizeBody(null))).toBe('{}');
    expect(JSON.stringify(sanitizeBody(123 as any))).toBe('{}');
  });

  it('sanitizePagination 应返回安全的分页参数', () => {
    const result = sanitizePagination({ query: { pageNum: '2', pageSize: '50' } } as any);
    expect(result.pageNum).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it('sanitizePagination 应限制最大页大小', () => {
    const result = sanitizePagination({ query: { pageSize: String(MAX_PAGE_SIZE + 100) } } as any);
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('sanitizePagination 对负数应回退到默认值', () => {
    const result = sanitizePagination({ query: { pageNum: '-1', pageSize: '0' } } as any);
    expect(result.pageNum).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});
