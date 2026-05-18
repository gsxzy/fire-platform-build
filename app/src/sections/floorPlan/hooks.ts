import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type Konva from 'konva';
import { floorPlanService as api } from '@/api/services';
import { useToast } from '@/core/ToastContext';
import type { Unit, Building, Floor, FloorDevice, UnmarkedDevice, CameraBinding, AlarmMessage } from './types';
import { resolveCadPlanDimensions, normalizeList, mapUnitRow, playBeep } from './utils';

export function useFloorPlan() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  /* ── 数据状态 ── */
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [currentFloor, setCurrentFloor] = useState<Floor | null>(null);
  const [devices, setDevices] = useState<FloorDevice[]>([]);
  const [unmarked, setUnmarked] = useState<UnmarkedDevice[]>([]);
  const [cameras, setCameras] = useState<CameraBinding[]>([]);
  const [alarmIds, setAlarmIds] = useState<Set<string>>(new Set());
  const [selectedDevice, setSelectedDevice] = useState<FloorDevice | null>(null);
  const [activeDevice, setActiveDevice] = useState<UnmarkedDevice | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<UnmarkedDevice[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* ── Konva 画布状态 ── */
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1000, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  /* ── 视频联动 ── */
  const [showVideo, setShowVideo] = useState(false);
  const [linkedCamera, setLinkedCamera] = useState<CameraBinding | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ── CAD 图纸 ── */
  const [cadData, setCadData] = useState<any>(null);

  /* ── 视频弹窗 ── */
  const [videoPopupOpen, setVideoPopupOpen] = useState(false);
  const [videoPopupCameraId, setVideoPopupCameraId] = useState<string>('');
  const [videoPopupChannelId, setVideoPopupChannelId] = useState<string>('');
  const [videoPopupCameraName, setVideoPopupCameraName] = useState<string>('');

  /* ── Excel 导入 ── */
  const [importResult, setImportResult] = useState<{ total: number; success: number; failed: number; unmatched: string[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');

  /* ── 新建建筑 ── */
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [addBuildingLoading, setAddBuildingLoading] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ name: '', type: '商业', total_floors: 1, address: '' });

  /* ── 悬浮提示 ── */
  const [hoverDevice, setHoverDevice] = useState<FloorDevice | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ── Refs ── */
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const autoNavRef = useRef<{ deviceId: string; x: number; y: number } | null>(null);
  const pendingSelectDeviceIdRef = useRef<string | null>(null);
  const panLastRef = useRef({ x: 0, y: 0 });
  const panAccumRef = useRef(0);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  /* ═══════ 数据加载 ═══════ */

  useEffect(() => {
    api.get('/units/list', { pageSize: 500 }).then((res: unknown) => {
      const list = normalizeList(res);
      setUnits(list.map(mapUnitRow).filter((u: Unit) => u.id));
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!selectedUnit) {
      setBuildings([]);
      setSelectedBuilding(null);
      return;
    }
    api.get(`/buildings`, { pageSize: 100, unit_id: selectedUnit }).then((res: unknown) => {
      const list = normalizeList(res);
      setBuildings(list);
      if (list.length > 0) setSelectedBuilding(list[0].id);
      else setSelectedBuilding(null);
    }).catch(() => { });
  }, [selectedUnit]);

  useEffect(() => {
    if (!selectedBuilding) { setFloors([]); setSelectedFloor(null); return; }
    api.get(`/floors`, { building_id: selectedBuilding }).then((res: unknown) => {
      const list = normalizeList(res);
      setFloors(list);
      if (list.length > 0) setSelectedFloor(list[0].id);
    }).catch(() => { });
  }, [selectedBuilding]);

  const loadFloorData = useCallback(async (floorId: number) => {
    setLoading(true);
    try {
      const [fRes, dRes, uRes, cRes] = await Promise.all([
        api.get(`/floors/${floorId}`),
        api.get(`/floors/${floorId}/devices`),
        api.get(`/floors/${floorId}/devices/unmarked`),
        api.get(`/floors/${floorId}/cameras`),
      ]);
      const floorRow = fRes as Floor | null;
      setCurrentFloor(floorRow);
      setDevices(normalizeList(dRes));
      setUnmarked(normalizeList(uRes));
      setCameras(normalizeList(cRes));
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      const floorAny = floorRow as Record<string, unknown> | null;
      if (floorAny?.plan_type === 'cad' && floorAny?.plan_cad_data) {
        try {
          const parsed = typeof floorAny.plan_cad_data === 'string'
            ? JSON.parse(floorAny.plan_cad_data as string)
            : floorAny.plan_cad_data;
          setCadData(parsed);
        } catch { setCadData(null); }
      } else { setCadData(null); }
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setDeviceSearchQuery('');
    if (!selectedFloor) { setCurrentFloor(null); setDevices([]); return; }
    loadFloorData(selectedFloor);
  }, [selectedFloor, loadFloorData]);

  /* ── 窗口自适应 ── */
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const fitPlanDimensionsToContainer = useCallback((w: number, h: number) => {
    if (!containerRef.current || w <= 0 || h <= 0) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const pad = 32;
    const sx = (cw - pad) / w;
    const sy = (ch - pad) / h;
    const next = Math.max(0.08, Math.min(4, Math.min(sx, sy)));
    setStageScale(next);
    setStagePos({ x: (cw - w * next) / 2, y: (ch - h * next) / 2 });
  }, []);

  const applyPendingAutoNav = useCallback((w: number, h: number) => {
    if (!autoNavRef.current || !containerRef.current) return;
    const { x, y } = autoNavRef.current;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const targetScale = 1.8;
    const px = (x / 100) * w;
    const py = (y / 100) * h;
    setStageScale(targetScale);
    setStagePos({ x: containerW / 2 - px * targetScale, y: containerH / 2 - py * targetScale });
    autoNavRef.current = null;
  }, []);

  const fitPlanToStage = useCallback(() => {
    fitPlanDimensionsToContainer(imageSize.width, imageSize.height);
  }, [imageSize.width, imageSize.height, fitPlanDimensionsToContainer]);

  useEffect(() => {
    if (!currentFloor?.plan_image_url) { setImageObj(null); return; }
    const img = new window.Image();
    img.src = currentFloor.plan_image_url;
    img.onload = () => {
      const w = currentFloor.plan_width || img.naturalWidth || 1000;
      const h = currentFloor.plan_height || img.naturalHeight || 800;
      setImageObj(img);
      setImageSize({ width: w, height: h });
      applyPendingAutoNav(w, h);
    };
  }, [currentFloor?.plan_image_url, currentFloor?.plan_width, currentFloor?.plan_height, applyPendingAutoNav]);

  useEffect(() => {
    if (!currentFloor) return;
    const cadOnly = !currentFloor.plan_image_url && currentFloor.plan_type === 'cad' && cadData;
    if (!cadOnly) return;
    const { width: w, height: h } = resolveCadPlanDimensions(currentFloor, cadData);
    setImageSize({ width: w, height: h });
    if (autoNavRef.current) applyPendingAutoNav(w, h);
    else requestAnimationFrame(() => fitPlanDimensionsToContainer(w, h));
  }, [
    currentFloor?.id, currentFloor?.plan_image_url, currentFloor?.plan_type,
    currentFloor?.plan_width, currentFloor?.plan_height, cadData,
    applyPendingAutoNav, fitPlanDimensionsToContainer,
  ]);

  const autoNavigateToDevice = useCallback(async (deviceId: string) => {
    try {
      const res: unknown = await api.get(`/devices/${deviceId}/position`);
      const pos = res as { floor_id?: number; x?: number; y?: number } | null;
      if (!pos || pos.floor_id == null || pos.x == null || pos.y == null) return;
      const fRes = await api.get(`/floors/${pos.floor_id}`);
      const floor = fRes as Floor;
      setSelectedBuilding(floor.building_id);
      setSelectedFloor(floor.id);
      autoNavRef.current = { deviceId, x: pos.x, y: pos.y };
      pendingSelectDeviceIdRef.current = deviceId;
    } catch { }
  }, []);

  useEffect(() => {
    const id = pendingSelectDeviceIdRef.current;
    if (!id) return;
    const dev = devices.find(d => d.device_id === id);
    if (dev) { setSelectedDevice(dev); pendingSelectDeviceIdRef.current = null; }
  }, [devices]);

  /* ═══════ WebSocket 告警监听 ═══════ */
  useEffect(() => {
    const ws = (window as any).__WS__;
    if (!ws) return;
    const handler = (e: MessageEvent) => {
      try {
        const data: AlarmMessage = JSON.parse(e.data);
        if (data.type === 'alarm' && data.device_id) {
          const did = String(data.device_id);
          setAlarmIds(prev => new Set(prev).add(did));
          if (soundEnabled) playBeep();
          setTimeout(() => {
            setAlarmIds(prev => { const next = new Set(prev); next.delete(did); return next; });
          }, 10000);
          autoNavigateToDevice(did);
        }
      } catch { }
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [soundEnabled, autoNavigateToDevice]);

  /* ── 告警闪烁动画 ── */
  useEffect(() => {
    if (alarmIds.size === 0) return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [alarmIds.size]);

  /* ── Esc 退出标点 / 连续标点 ── */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (batchMode) {
        setBatchMode(false); setBatchQueue([]); setBatchIndex(0); setActiveDevice(null);
      } else if (activeDevice) { setActiveDevice(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [batchMode, activeDevice]);

  /* ═══════ 画布交互 ═══════ */

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stageScale;
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.1, Math.min(4, newScale));
    const mousePointTo = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale };
    setStageScale(clamped);
    setStagePos({ x: pointer.x - mousePointTo.x * clamped, y: pointer.y - mousePointTo.y * clamped });
  };

  const handleStageMouseDown = (e: any) => {
    if (e.target === e.target.getStage()) {
      panAccumRef.current = 0;
      panLastRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX - stagePos.x, y: e.evt.clientY - stagePos.y });
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!isPanning) return;
    const dx = e.evt.clientX - panLastRef.current.x;
    const dy = e.evt.clientY - panLastRef.current.y;
    panAccumRef.current += Math.abs(dx) + Math.abs(dy);
    panLastRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    setStagePos({ x: e.evt.clientX - panStart.x, y: e.evt.clientY - panStart.y });
  };

  const handleStageMouseUp = () => setIsPanning(false);

  /* ── 点击画布标点 ── */
  const handleStageClick = (e: any) => {
    if (panAccumRef.current > 10) { panAccumRef.current = 0; return; }
    panAccumRef.current = 0;
    if (!activeDevice && !batchMode) return;
    if (e.target !== e.target.getStage()) return;
    const stage = stageRef.current;
    if (!stage || !imageSize.width) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const x = (pointer.x - stagePos.x) / stageScale;
    const y = (pointer.y - stagePos.y) / stageScale;
    const pctX = (x / imageSize.width) * 100;
    const pctY = (y / imageSize.height) * 100;
    if (pctX < 0 || pctX > 100 || pctY < 0 || pctY > 100) return;

    const placeDevice = async (dev: UnmarkedDevice) => {
      await api.post(`/floors/${selectedFloor}/devices`, { device_id: dev.device_id, x: pctX, y: pctY });
    };

    if (batchMode) {
      const dev = batchQueue[batchIndex];
      if (!dev) return;
      placeDevice(dev).then(() => {
        success('已标点');
        const next = batchIndex + 1;
        if (next >= batchQueue.length) {
          setBatchMode(false); setBatchQueue([]); setBatchIndex(0); setActiveDevice(null);
        } else { setBatchIndex(next); setActiveDevice(batchQueue[next]); }
        if (selectedFloor) loadFloorData(selectedFloor);
      }).catch(() => { toastError('标点失败', '请检查网络或设备是否仍在本层待标点列表中'); });
    } else if (activeDevice) {
      placeDevice(activeDevice).then(() => {
        success('已标点'); setActiveDevice(null);
        if (selectedFloor) loadFloorData(selectedFloor);
      }).catch(() => { toastError('标点失败', '请检查网络或设备是否仍在本层待标点列表中'); });
    }
  };

  /* ═══════ 操作函数 ═══════ */

  const deletePosition = async (positionId: number) => {
    if (!selectedFloor) return;
    if (!window.confirm('确定从本层平面图移除该设备点位？不会删除设备档案。')) return;
    try {
      await api.delete(`/floors/${selectedFloor}/devices/${positionId}`);
      setDevices(prev => prev.filter(d => d.position_id !== positionId));
      setSelectedDevice(null);
      const uRes = await api.get(`/floors/${selectedFloor}/devices/unmarked`);
      setUnmarked(normalizeList(uRes));
      success('已删除点位');
    } catch { }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFloor) return;
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/floors/${selectedFloor}/plan`, form);
      success('平面图已更新');
      await loadFloorData(selectedFloor);
    } catch { } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFloor) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res: any = await api.post(`/floors/${selectedFloor}/devices/import`, form);
      if (res && typeof res === 'object') {
        setImportResult({ total: res.total || 0, success: res.success || 0, failed: res.failed || 0, unmatched: res.unmatched || [] });
        if (res.success > 0) { success(`导入完成：成功 ${res.success} 条`); loadFloorData(selectedFloor); }
        else if (res.total > 0) toastError('导入未成功', '请检查 Excel 格式与设备编码是否与本层匹配');
      }
    } catch { } finally { setImportLoading(false); if (importRef.current) importRef.current.value = ''; }
  };

  const submitNewBuilding = async () => {
    const name = newBuilding.name.trim();
    if (!selectedUnit) { toastError('无法创建', '请先选择单位'); return; }
    if (!name) { toastError('请填写建筑名称', '名称为必填项'); return; }
    setAddBuildingLoading(true);
    try {
      const data = await api.post<{ id?: number }>('/buildings', {
        name, unit_id: selectedUnit,
        type: newBuilding.type.trim() || '商业',
        total_floors: Math.max(1, Math.floor(Number(newBuilding.total_floors)) || 1),
        address: newBuilding.address.trim(),
      });
      const newId = data && typeof data === 'object' && data.id != null ? Number(data.id) : undefined;
      success('建筑已创建');
      setAddBuildingOpen(false);
      setNewBuilding({ name: '', type: '商业', total_floors: 1, address: '' });
      const res = await api.get('/buildings', { pageSize: 100, unit_id: selectedUnit });
      const list = normalizeList(res) as Building[];
      setBuildings(list);
      if (newId != null && list.some(b => b.id === newId)) setSelectedBuilding(newId);
      else if (list.length > 0) setSelectedBuilding(list[0].id);
      else setSelectedBuilding(null);
    } catch { } finally { setAddBuildingLoading(false); }
  };

  const startBatchMark = () => {
    if (unmarked.length === 0) return;
    setBatchMode(true); setBatchQueue(unmarked); setBatchIndex(0); setActiveDevice(unmarked[0]);
  };

  const handleDeviceClick = (device: FloorDevice) => {
    setSelectedDevice(device);
    if (device.bind_camera_id) {
      setVideoPopupCameraId(device.bind_camera_id);
      setVideoPopupChannelId(device.bind_camera_channel || device.bind_camera_id);
      setVideoPopupCameraName(device.device_name + ' 关联视频');
      setVideoPopupOpen(true);
      return;
    }
    const linked = cameras.find(c => Array.isArray(c.bound_device_ids) && c.bound_device_ids.includes(device.device_id));
    if (linked) {
      setLinkedCamera(linked);
      setShowVideo(true);
      setVideoPopupCameraId(linked.camera_device_id);
      setVideoPopupChannelId(linked.camera_device_id);
      setVideoPopupCameraName(linked.camera_name || '关联摄像头');
      setVideoPopupOpen(true);
    } else { setShowVideo(false); setLinkedCamera(null); }
  };

  /* ═══════ 统计 ═══════ */
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === 1).length;
    const fault = devices.filter(d => d.status === 2).length;
    const offline = devices.filter(d => d.status === 3).length;
    const alarm = devices.filter(d => alarmIds.has(d.device_id)).length;
    return { total, online, fault, offline, alarm };
  }, [devices, alarmIds]);

  const filteredUnmarked = useMemo(() => {
    const q = deviceSearchQuery.trim().toLowerCase();
    if (!q) return unmarked;
    return unmarked.filter(d =>
      d.device_name.toLowerCase().includes(q) ||
      d.device_code.toLowerCase().includes(q) ||
      String(d.device_type || '').toLowerCase().includes(q)
    );
  }, [unmarked, deviceSearchQuery]);

  const filteredDevices = useMemo(() => {
    const q = deviceSearchQuery.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(d =>
      d.device_name.toLowerCase().includes(q) ||
      d.device_code.toLowerCase().includes(q) ||
      String(d.device_type || '').toLowerCase().includes(q)
    );
  }, [devices, deviceSearchQuery]);

  const hasPlanCanvas = useMemo(
    () => !!(currentFloor && (currentFloor.plan_image_url || (currentFloor.plan_type === 'cad' && cadData))),
    [currentFloor, cadData]
  );

  return {
    units, selectedUnit, setSelectedUnit,
    buildings, selectedBuilding, setSelectedBuilding,
    floors, selectedFloor, setSelectedFloor,
    currentFloor, devices, unmarked, cameras, alarmIds,
    selectedDevice, setSelectedDevice,
    activeDevice, setActiveDevice,
    batchMode, batchQueue, batchIndex,
    loading, soundEnabled, setSoundEnabled,
    stageScale, setStageScale, stagePos, setStagePos,
    imageObj, imageSize,
    isPanning, setIsPanning,
    tick,
    showVideo, linkedCamera,
    isFullscreen, setIsFullscreen,
    videoPopupOpen, setVideoPopupOpen,
    videoPopupCameraId, videoPopupChannelId, videoPopupCameraName,
    importResult, setImportResult,
    importLoading,
    deviceSearchQuery, setDeviceSearchQuery,
    addBuildingOpen, setAddBuildingOpen,
    addBuildingLoading,
    newBuilding, setNewBuilding,
    hoverDevice, setHoverDevice,
    mousePos, setMousePos,
    stageRef, containerRef, fileRef, importRef,
    stageSize,
    fitPlanToStage,
    handleWheel, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp, handleStageClick,
    deletePosition, handleUpload, handleImportExcel,
    submitNewBuilding, startBatchMark, handleDeviceClick,
    stats, filteredUnmarked, filteredDevices, hasPlanCanvas,
    loadFloorData, setBatchMode, cadData,
    navigate,
  };
}
