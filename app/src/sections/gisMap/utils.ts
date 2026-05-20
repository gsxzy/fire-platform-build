import type { MapUnit } from '@/types/map';

export function formatUnitTypeLabel(t: unknown): string {
  const n = Number(t);
  if (n === 2) return '重点单位';
  if (n === 3) return '九小场所';
  if (n === 1) return '一般单位';
  return typeof t === 'string' && t ? t : '未知';
}

export function mapGisUnitRow(
  u: Record<string, unknown>,
  devices: Record<string, unknown>[],
  activeAlarms: Record<string, unknown>[]
): MapUnit {
  const uid = Number(u.id);
  const unitDevices = devices.filter((d) => Number(d.unit_id) === uid);
  const onlineCount = unitDevices.filter((d) => Number(d.status) === 1).length;
  const faultCount = unitDevices.filter((d) => Number(d.status) !== 1).length;
  const alarmsForUnit = activeAlarms.filter((a) => {
    const rid = a.unit_id != null ? Number(a.unit_id) : NaN;
    if (rid === uid) return true;
    const un = String(a.unit_name ?? '');
    return un && un === String(u.unit_name ?? '');
  });

  const ut = Number(u.unit_type);
  let type: MapUnit['type'] = 'general';
  if (ut === 2) type = 'key';
  else if (ut === 3) type = 'nine-small';

  const rawLat = Number(u.lat);
  const rawLng = Number(u.lng);
  const lat = Number.isFinite(rawLat) ? rawLat : NaN;
  const lng = Number.isFinite(rawLng) ? rawLng : NaN;

  return {
    id: String(u.id ?? ''),
    name: String(u.unit_name ?? `单位${u.id}`),
    lat,
    lng,
    type,
    unitType: formatUnitTypeLabel(u.unit_type),
    address: String(u.address ?? ''),
    online: unitDevices.length === 0 ? Number(u.status) === 1 : onlineCount >= Math.ceil(unitDevices.length / 2),
    alarm: alarmsForUnit.length,
    fault: faultCount,
    devices: unitDevices.length,
    controlRoom: false,
  };
}
