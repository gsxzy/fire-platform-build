import type { Unit, Floor, CadBounds } from './types';

/** 纯 CAD 或无栅格底图时，确定与设备百分比坐标一致的逻辑画布尺寸 */
export function resolveCadPlanDimensions(
  floor: Pick<Floor, 'plan_width' | 'plan_height'>,
  cadData: { bounds?: CadBounds } | null
): { width: number; height: number } {
  const pw = Number(floor.plan_width) || 0;
  const ph = Number(floor.plan_height) || 0;
  if (pw > 0 && ph > 0) return { width: pw, height: ph };
  const b = cadData?.bounds;
  if (b) {
    const bw = Math.abs((b.maxx ?? 0) - (b.minx ?? 0));
    const bh = Math.abs((b.maxy ?? 0) - (b.miny ?? 0));
    if (bw > 1 && bh > 1) return { width: Math.max(200, bw), height: Math.max(200, bh) };
  }
  return { width: 1000, height: 800 };
}

/** 兼容后端返回数组或 { list } */
export function normalizeList(res: unknown): any[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && Array.isArray((res as { list?: unknown }).list)) {
    return (res as { list: any[] }).list;
  }
  return [];
}

export function mapUnitRow(u: Record<string, unknown>): Unit {
  return {
    id: String(u.id ?? ''),
    name: String(u.name ?? u.unit_name ?? '未命名单位'),
    type: String(u.type ?? u.unit_type ?? ''),
    address: u.address != null ? String(u.address) : undefined,
  };
}

export function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 150);
  } catch {}
}
