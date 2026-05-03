export const success = <T>(data: T, msg = '操作成功') => ({ code: 200, message: msg, data, timestamp: Date.now() });
export const fail = (msg = '操作失败', code = 400) => ({ code, message: msg, data: null, timestamp: Date.now() });
export const page = <T>(list: T[], total: number, pageNum: number, pageSize: number) => ({
  code: 200, message: '查询成功', data: { list, total, pageNum, pageSize, pages: Math.ceil(total / pageSize) }, timestamp: Date.now()
});
