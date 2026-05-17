import { describe, it, expect } from '../test-utils';
import { success, fail, page } from '@/utils/response';

describe('Response Utils', () => {
  it('success 应生成标准成功响应', () => {
    const res = success({ id: 1 }, 'ok', 'req-123');
    expect(res.code).toBe(200);
    expect(res.message).toBe('ok');
    expect(res.data.id).toBe(1);
    expect(res.requestId).toBe('req-123');
    expect(typeof res.timestamp).toBe('number');
  });

  it('fail 应生成标准失败响应', () => {
    const res = fail('参数错误', 400, 'req-456');
    expect(res.code).toBe(400);
    expect(res.message).toBe('参数错误');
    expect(res.data).toBe(null);
    expect(res.requestId).toBe('req-456');
  });

  it('page 应生成分页响应', () => {
    const res = page([{ a: 1 }], 100, 2, 20);
    expect(res.code).toBe(200);
    expect(res.data.list.length).toBe(1);
    expect(res.data.total).toBe(100);
    expect(res.data.pageNum).toBe(2);
    expect(res.data.pageSize).toBe(20);
  });
});
