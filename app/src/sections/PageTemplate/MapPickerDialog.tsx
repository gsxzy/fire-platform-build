import { useState, useEffect, useRef } from 'react';
import { useAMap } from '@/hooks/useAMap';
import { MapPin, Search, X, CheckCircle, Loader2 } from 'lucide-react';

interface MapPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lng: number, lat: number) => void;
  initialLng?: number;
  initialLat?: number;
}

export function MapPickerDialog({ open, onClose, onConfirm, initialLng, initialLat }: MapPickerDialogProps) {
  const { loading: mapLoading, loaded, AMap } = useAMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  /* 初始化地图 */
  useEffect(() => {
    if (!open || !loaded || !AMap || !mapContainerRef.current) return;

    const lng = initialLng ?? 103.8;
    const lat = initialLat ?? 36.1;

    const map = new AMap.Map(mapContainerRef.current, {
      zoom: 14,
      center: [lng, lat],
      mapStyle: 'amap://styles/darkblue',
    });
    mapRef.current = map;

    // 初始标记
    if (initialLng !== undefined && initialLat !== undefined) {
      const marker = new AMap.Marker({
        position: [initialLng, initialLat],
        anchor: 'bottom-center',
      });
      marker.setMap(map);
      markerRef.current = marker;
    }

    // 点击地图选点
    map.on('click', (e: any) => {
      const lnglat = e.lnglat;
      const lng = lnglat.getLng();
      const lat = lnglat.getLat();
      setSelectedLng(lng);
      setSelectedLat(lat);
      if (markerRef.current) {
        markerRef.current.setPosition([lng, lat]);
      } else {
        const marker = new AMap.Marker({ position: [lng, lat], anchor: 'bottom-center' });
        marker.setMap(map);
        markerRef.current = marker;
      }
    });

    return () => {
      map.destroy();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, loaded, AMap, initialLng, initialLat]);

  /* 地址搜索 */
  const handleSearch = () => {
    if (!AMap || !searchKeyword.trim()) return;
    setSearching(true);
    setSearchResults([]);
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({ pageSize: 10, pageIndex: 1 });
      placeSearch.search(searchKeyword, (status: string, result: any) => {
        setSearching(false);
        if (status === 'complete' && result?.info === 'OK' && result?.poiList?.pois) {
          setSearchResults(result.poiList.pois);
        } else {
          setSearchResults([]);
        }
      });
    });
  };

  /* 选择搜索结果 */
  const handleSelectResult = (poi: any) => {
    const loc = poi.location;
    if (!loc || !mapRef.current) return;
    const lng = typeof loc.lng === 'number' ? loc.lng : loc.getLng?.();
    const lat = typeof loc.lat === 'number' ? loc.lat : loc.getLat?.();
    if (lng === undefined || lat === undefined) return;

    mapRef.current.setCenter([lng, lat]);
    setSelectedLng(lng);
    setSelectedLat(lat);
    if (markerRef.current) {
      markerRef.current.setPosition([lng, lat]);
    } else {
      const marker = new AMap.Marker({ position: [lng, lat], anchor: 'bottom-center' });
      marker.setMap(mapRef.current);
      markerRef.current = marker;
    }
    setSearchResults([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl mx-4 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-3 border-b border-slate-600/30 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" /> 地图选点
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-3 overflow-y-auto">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="输入地址搜索（如：兰州市城关区张掖路）"
              className="flex-1 bg-slate-700/40 border border-slate-600/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchKeyword.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} 搜索
            </button>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-slate-900/40 rounded-lg border border-slate-700/30">
              {searchResults.map((poi, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(poi)}
                  className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-700/40 border-b border-slate-700/20 last:border-0 transition-colors"
                >
                  <span className="font-medium text-slate-200">{poi.name}</span>
                  <span className="text-slate-500 ml-1">{poi.address}</span>
                </button>
              ))}
            </div>
          )}

          {/* 地图容器 */}
          <div className="relative w-full h-80 rounded-lg border border-slate-700/30 bg-slate-900 overflow-hidden">
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  地图加载中…
                </div>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* 坐标显示 */}
          <div className="flex items-center justify-between text-[11px]">
            <span className={`${selectedLng !== null ? 'text-emerald-400' : 'text-slate-500'}`}>
              {selectedLng !== null && selectedLat !== null
                ? `已选: 经度 ${selectedLng.toFixed(6)}  纬度 ${selectedLat.toFixed(6)}`
                : '请在地图上点击选择位置，或输入地址搜索'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-600/30 flex justify-end gap-2.5 bg-slate-800/60 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-300 hover:text-slate-200 border border-slate-600 rounded-lg transition-colors">
            取消
          </button>
          <button
            onClick={() => {
              if (selectedLng !== null && selectedLat !== null) {
                onConfirm(selectedLng, selectedLat);
                onClose();
              }
            }}
            disabled={selectedLng === null || selectedLat === null}
            className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> 确认选点
          </button>
        </div>
      </div>
    </div>
  );
}
