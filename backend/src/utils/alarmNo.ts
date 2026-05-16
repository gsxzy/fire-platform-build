/**
 * 告警编号生成工具
 * 统一全平台的告警编号格式，避免多处复制粘贴
 */
export function generateAlarmNo(): string {
  return `ALM${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
