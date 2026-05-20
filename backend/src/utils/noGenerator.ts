/**
 * 通用业务编号生成工具
 */

const PREFIX_MAP: Record<string, string> = {
  ALM: 'ALM',   // 告警
  JJ: 'JJ',     // 接警
  JH: 'JH',     // 交接班
  RZ: 'RZ',     // 日志
  PB: 'PB',     // 排班
  BC: 'BC',     // 班次
};

export async function generateNo(prefix: string, seq?: number): Promise<string> {
  const p = PREFIX_MAP[prefix] || prefix;
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seqStr = seq !== undefined
    ? String(seq).padStart(4, '0')
    : String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${p}${dateStr}${seqStr}`;
}
