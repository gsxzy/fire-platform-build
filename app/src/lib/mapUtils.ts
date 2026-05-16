// src/lib/mapUtils.ts
/**
 * 地图工具函数 - 封装 AMap 相关的通用逻辑
 */
import { logger } from './logger';

/** 甘肃省地图范围 */
export const GANSU_MAP_BOUNDS = {
  sw: [92.15, 32.32] as [number, number],
  ne: [108.88, 42.92] as [number, number],
  center: [103.8236, 36.058] as [number, number],
  defaultZoom: 6.9,
  minZoom: 5.2,
} as const;

/** 省级名称：用于 setCity */
export const GANSU_SET_CITY_NAME = '甘肃省';

/** 判断坐标是否在甘肃范围内 */
export function isLngLatInGansu(lng: number, lat: number): boolean {
  return (
    lng >= GANSU_MAP_BOUNDS.sw[0] &&
    lng <= GANSU_MAP_BOUNDS.ne[0] &&
    lat >= GANSU_MAP_BOUNDS.sw[1] &&
    lat <= GANSU_MAP_BOUNDS.ne[1]
  );
}

/** 将坐标限制在甘肃范围内 */
export function clampLngLatToGansu(lng: number, lat: number): [number, number] {
  return [
    Math.min(Math.max(lng, GANSU_MAP_BOUNDS.sw[0]), GANSU_MAP_BOUNDS.ne[0]),
    Math.min(Math.max(lat, GANSU_MAP_BOUNDS.sw[1]), GANSU_MAP_BOUNDS.ne[1]),
  ];
}

/** 创建矩形范围 Bounds 实例 */
export function gansuRectBoundsInstance(A: any): any {
  return new A.Bounds(
    new A.LngLat(GANSU_MAP_BOUNDS.sw[0], GANSU_MAP_BOUNDS.sw[1]),
    new A.LngLat(GANSU_MAP_BOUNDS.ne[0], GANSU_MAP_BOUNDS.ne[1]),
  );
}

/** 应用甘肃矩形范围限制 */
export function applyGansuLimitRect(map: any, A: any): void {
  try {
    map.setLimitBounds(gansuRectBoundsInstance(A));
  } catch (e) {
    logger.warn('[GIS] setLimitBounds(甘肃矩形) 失败', e);
  }
}

/** 用行政区查询收紧 limitBounds */
export function tightenLimitFromDistrictSearch(map: any, A: any): void {
  if (!A?.plugin) {
    applyGansuLimitRect(map, A);
    return;
  }
  
  A.plugin(['AMap.DistrictSearch'], () => {
    try {
      if (typeof A.DistrictSearch !== 'function') {
        applyGansuLimitRect(map, A);
        return;
      }
      
      const ds = new A.DistrictSearch({
        extensions: 'all',
        level: 'province',
        subdistrict: 0,
      });
      
      ds.search(GANSU_SET_CITY_NAME, (status: string, result: any) => {
        let applied = false;
        if (status === 'complete' && result?.districtList?.[0]) {
          const rings = result.districtList[0].boundaries as unknown[] | undefined;
          if (Array.isArray(rings) && rings.length) {
            let minLng = Infinity;
            let minLat = Infinity;
            let maxLng = -Infinity;
            let maxLat = -Infinity;
            
            for (const ring of rings) {
              if (!Array.isArray(ring)) continue;
              for (const pt of ring) {
                let lng: number;
                let lat: number;
                
                if (Array.isArray(pt) && pt.length >= 2) {
                  lng = Number(pt[0]);
                  lat = Number(pt[1]);
                } else if (pt && typeof pt === 'object' && 'getLng' in (pt as object)) {
                  const p = pt as { getLng: () => number; getLat: () => number };
                  lng = p.getLng();
                  lat = p.getLat();
                } else if (pt && typeof pt === 'object' && 'lng' in (pt as object)) {
                  const p = pt as { lng: number; lat: number };
                  lng = Number(p.lng);
                  lat = Number(p.lat);
                } else continue;
                
                if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
                minLng = Math.min(minLng, lng);
                minLat = Math.min(minLat, lat);
                maxLng = Math.max(maxLng, lng);
                maxLat = Math.max(maxLat, lat);
              }
            }
            
            if (minLng < maxLng && minLat < maxLat) {
              try {
                map.setLimitBounds(
                  new A.Bounds(new A.LngLat(minLng, minLat), new A.LngLat(maxLng, maxLat)),
                );
                applied = true;
              } catch (e) {
                logger.warn('[GIS] 省界外包 setLimitBounds 失败', e);
              }
            }
          }
        }
        if (!applied) applyGansuLimitRect(map, A);
      });
    } catch {
      applyGansuLimitRect(map, A);
    }
  });
}

/** 绑定甘肃视野 */
export function bindGansuViewport(map: any, A: any): void {
  if (!map || !A) return;
  applyGansuLimitRect(map, A);
  
  let ran = false;
  const sync = () => {
    if (ran) return;
    ran = true;
    try {
      map.setCity(GANSU_SET_CITY_NAME);
    } catch { /* ignore */ }
    tightenLimitFromDistrictSearch(map, A);
  };
  
  try {
    map.on('complete', sync);
  } catch { /* ignore */ }
  
  setTimeout(sync, 500);
}

/** 复位到甘肃概览 */
export function resetMapToGansuOverview(map: any, A: any): void {
  if (!map) return;
  try {
    map.setZoomAndCenter(GANSU_MAP_BOUNDS.defaultZoom, [...GANSU_MAP_BOUNDS.center]);
  } catch { /* ignore */ }
  try {
    map.setCity(GANSU_SET_CITY_NAME);
  } catch { /* ignore */ }
  applyGansuLimitRect(map, A);
  tightenLimitFromDistrictSearch(map, A);
}

/** 字符串哈希函数 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}