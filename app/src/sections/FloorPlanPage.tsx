import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image, Circle, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Layout, Upload, ZoomIn, ZoomOut, RotateCcw,
  Trash2, Eye, AlertTriangle, X, Layers,
  MonitorPlay, Volume2, VolumeX, Crosshair, Maximize, Minimize,
  FileSpreadsheet
} from 'lucide-react';
import { DeviceIcon, DeviceTooltip } from '@/components/floorplan/DeviceIcons';
import VideoPopup from '@/components/floorplan/VideoPopup';
import CADRenderer from '@/components/floorplan/CADRenderer';

/* ═══════════════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════════════ */
interface Unit {
  id: string;
  name: string;
  type: string;
  address?: string;
}

interface Building {
  id: number;
  name: string;
  unit_id: string;
  type: string;
  total_floors: number;
  address?: string;
}

interface Floor {
  id: number;
  name: string;
  floor_number: number;
  building_id: number;
  plan_image_url?: string;
  plan_width?: number;
  plan_height?: number;
}

interface FloorDevice {
  position_id: number;
  device_id: string;
  x: number;
  y: number;
  device_name: string;
  device_code: string;
  device_type: string;
  status: number;
  bind_camera_id?: string;
  bind_camera_channel?: string;
}

interface UnmarkedDevice {
  id: number;
  device_id: string;
  device_name: string;
  device_code: string;
  device_type: string;
  status: number;
}

interface CameraBinding {
  id: number;
  floor_id: number;
  camera_device_id: string;
  bound_device_ids: string[];
  x: number;
  y: number;
  preset_no: number;
  stream_url?: string;
  camera_name?: string;
}

interface AlarmMessage {
  type: string;
  device_id?: string;
  device_name?: string;
  alarm_type?: string;
}

/* ═══════════════════════════════════════════════════════════════
   常量
   ═══════════════════════════════════════════════════════════════ */
const STATUS_COLOR: Record<number, string> = {
  1: '#10b981',
  2: '#f59e0b',
  3: '#ef4444',
  4: '#64748b',
};
const STATUS_LABEL: Record<number, string> = {
  1: '在线', 2: '故障', 3: '离线', 4: '报废',
};
/* const DEVICE_ICON: Record<string, string> = {
  '烟感': '●', '温感': '◆', '手报': '▲', '消火栓': '■',
  '摄像头': '◎', '风机': '▼', '泵': '♦', 'default': '●',
}; */

/* ═══════════════════════════════════════════════════════════════
   辅助函数
   ═══════════════════════════════════════════════════════════════ */
function playBeep() {
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

/* function getDeviceIcon(type: string) {
  for (const [k, v] of Object.entries(DEVICE_ICON)) {
    if (type.includes(k)) return v;
  }
  return DEVICE_ICON.default;
} */

/* ═══════════════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════════════ */
export default function FloorPlanPage() {
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
  const [videoPopupCameraName, setVideoPopupCameraName] = useState<string>('');

  /* ── Excel 导入 ── */
  const [importResult, setImportResult] = useState<{total:number;success:number;failed:number;unmatched:string[]}|null>(null);
  const [importLoading, setImportLoading] = useState(false);

  /* ── 悬浮提示 ── */
  const [hoverDevice, setHoverDevice] = useState<FloorDevice | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ── Refs ── */
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const autoNavRef = useRef<{ deviceId: string; x: number; y: number } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  /* ═══════ 数据加载 ═══════ */

  /* ── 加载单位列表 ── */
  useEffect(() => {
    api.get('/units').then((res: any) => {
      setUnits(res || []);
    }).catch(() => { /* 401时client.ts会自动跳转登录页 */ });
  }, []);

  /* ── 加载建筑列表（按单位筛选） ── */
  useEffect(() => {
    if (!selectedUnit) {
      setBuildings([]);
      setSelectedBuilding(null);
      return;
    }
    api.get(`/buildings?pageSize=100&unit_id=${selectedUnit}`).then((res: any) => {
      const list = res.list || [];
      setBuildings(list);
      if (list.length > 0) {
        setSelectedBuilding(list[0].id);
      } else {
        setSelectedBuilding(null);
      }
    }).catch(() => { /* 401时client.ts会自动跳转登录页 */ });
  }, [selectedUnit]);

  /* ── 加载楼层列表 ── */
  useEffect(() => {
    if (!selectedBuilding) { setFloors([]); setSelectedFloor(null); return; }
    api.get(`/floors?building_id=${selectedBuilding}`).then((res: any) => {
      const list = res || [];
      setFloors(list);
      if (list.length > 0) setSelectedFloor(list[0].id);
    }).catch(() => { /* 401时client.ts会自动跳转登录页 */ });
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
      setCurrentFloor(fRes);
      setDevices(dRes || []);
      setUnmarked(uRes || []);
      setCameras(cRes || []);
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
      // 解析 CAD 数据
      if (fRes?.plan_type === 'cad' && fRes?.plan_cad_data) {
        try {
          const parsed = typeof fRes.plan_cad_data === 'string'
            ? JSON.parse(fRes.plan_cad_data)
            : fRes.plan_cad_data;
          setCadData(parsed);
        } catch {
          setCadData(null);
        }
      } else {
        setCadData(null);
      }
    } catch {
      // 401时client.ts会自动跳转登录页
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFloor) { setCurrentFloor(null); setDevices([]); return; }
    loadFloorData(selectedFloor);
  }, [selectedFloor, loadFloorData]);

  /* ── 加载平面图图片 ── */
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

  useEffect(() => {
    if (!currentFloor?.plan_image_url) { setImageObj(null); return; }
    const img = new window.Image();
    img.src = currentFloor.plan_image_url;
    img.onload = () => {
      setImageObj(img);
      setImageSize({
        width: currentFloor.plan_width || img.naturalWidth || 1000,
        height: currentFloor.plan_height || img.naturalHeight || 800,
      });
      // 自动导航：如果有待跳转的设备，居中定位
      if (autoNavRef.current) {
        const { x, y } = autoNavRef.current;
        centerOnDevice(x, y);
        autoNavRef.current = null;
      }
    };
  }, [currentFloor?.plan_image_url]);

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
          // 10秒后移除闪烁
          setTimeout(() => {
            setAlarmIds(prev => {
              const next = new Set(prev);
              next.delete(did);
              return next;
            });
          }, 10000);
          // 自动定位到对应楼层
          autoNavigateToDevice(did);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [soundEnabled]);

  /* ── 告警闪烁动画 ── */
  useEffect(() => {
    if (alarmIds.size === 0) return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [alarmIds.size]);

  /* ── 自动跳转到告警设备 ── */
  const autoNavigateToDevice = useCallback(async (deviceId: string) => {
    try {
      const res: any = await api.get(`/devices/${deviceId}/position`);
      const pos = res;
      if (!pos) return;
      // 切到对应建筑/楼层
      const [fRes] = await Promise.all([
        api.get(`/floors/${pos.floor_id}`),
      ]);
      const floor: Floor = fRes;
      // 设置建筑
      setSelectedBuilding(floor.building_id);
      // 设置楼层（会触发 loadFloorData）
      setSelectedFloor(floor.id);
      // 记录待居中坐标
      autoNavRef.current = { deviceId, x: pos.x, y: pos.y };
      // 选中设备
      setTimeout(() => {
        const dev = devices.find(d => d.device_id === deviceId);
        if (dev) setSelectedDevice(dev);
      }, 500);
    } catch {
      // 401时client.ts会自动跳转登录页，无需额外处理
    }
  }, [devices]);

  /* ═══════ 画布交互 ═══════ */

  const centerOnDevice = (pctX: number, pctY: number) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const targetScale = 1.8;
    const px = (pctX / 100) * imageSize.width;
    const py = (pctY / 100) * imageSize.height;
    const newX = containerW / 2 - px * targetScale;
    const newY = containerH / 2 - py * targetScale;
    setStageScale(targetScale);
    setStagePos({ x: newX, y: newY });
  };

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
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    };
    setStageScale(clamped);
    setStagePos(newPos);
  };

  const handleStageMouseDown = (e: any) => {
    // 只有点击空白处（Stage 本身）才进入平移模式
    if (e.target === e.target.getStage()) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX - stagePos.x, y: e.evt.clientY - stagePos.y });
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!isPanning) return;
    setStagePos({
      x: e.evt.clientX - panStart.x,
      y: e.evt.clientY - panStart.y,
    });
  };

  const handleStageMouseUp = () => setIsPanning(false);

  /* ── 点击画布标点 ── */
  const handleStageClick = (e: any) => {
    if (isPanning) return;
    if (!activeDevice && !batchMode) return;
    if (e.target !== e.target.getStage()) return; // 点击设备时不触发标点

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
      await api.post(`/floors/${selectedFloor}/devices`, {
        device_id: dev.device_id, x: pctX, y: pctY,
      });
    };

    if (batchMode) {
      const dev = batchQueue[batchIndex];
      if (!dev) return;
      placeDevice(dev).then(() => {
        const next = batchIndex + 1;
        if (next >= batchQueue.length) {
          setBatchMode(false); setBatchQueue([]); setBatchIndex(0); setActiveDevice(null);
        } else {
          setBatchIndex(next); setActiveDevice(batchQueue[next]);
        }
        if (selectedFloor) loadFloorData(selectedFloor);
      });
    } else if (activeDevice) {
      placeDevice(activeDevice).then(() => {
        setActiveDevice(null);
        if (selectedFloor) loadFloorData(selectedFloor);
      });
    }
  };

  /* ═══════ 操作函数 ═══════ */

  const deletePosition = async (positionId: number) => {
    if (!selectedFloor) return;
    await api.delete(`/floors/${selectedFloor}/devices/${positionId}`);
    setDevices(prev => prev.filter(d => d.position_id !== positionId));
    setSelectedDevice(null);
    if (selectedFloor) {
      const uRes: any = await api.get(`/floors/${selectedFloor}/devices/unmarked`);
      setUnmarked(uRes || []);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFloor) return;
    const form = new FormData();
    form.append('file', file);
    await api.post(`/floors/${selectedFloor}/plan`, form);
    loadFloorData(selectedFloor);
    if (fileRef.current) fileRef.current.value = '';
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
        setImportResult({
          total: res.total || 0,
          success: res.success || 0,
          failed: res.failed || 0,
          unmatched: res.unmatched || [],
        });
        if (res.success > 0) {
          loadFloorData(selectedFloor);
        }
      }
    } catch (err: any) {
      // 错误提示由 api client 统一处理
    } finally {
      setImportLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const startBatchMark = () => {
    if (unmarked.length === 0) return;
    setBatchMode(true);
    setBatchQueue(unmarked);
    setBatchIndex(0);
    setActiveDevice(unmarked[0]);
  };

  const handleDeviceClick = (device: FloorDevice) => {
    setSelectedDevice(device);
    // 查找关联摄像头（优先使用 bind_camera_id，其次查找 camera_binding）
    if (device.bind_camera_id) {
      setVideoPopupCameraId(device.bind_camera_id);
      setVideoPopupCameraName(device.device_name + ' 关联视频');
      setVideoPopupOpen(true);
      return;
    }
    const linked = cameras.find(c =>
      Array.isArray(c.bound_device_ids) && c.bound_device_ids.includes(device.device_id)
    );
    if (linked) {
      setLinkedCamera(linked);
      setShowVideo(true);
      setVideoPopupCameraId(linked.camera_device_id);
      setVideoPopupCameraName(linked.camera_name || '关联摄像头');
      setVideoPopupOpen(true);
    } else {
      setShowVideo(false);
      setLinkedCamera(null);
    }
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

  /* ═══════ 渲染：设备点位 ═══════ */
  const renderDeviceNodes = () => {
    const pulse = Math.sin(tick * 0.6) * 0.5 + 0.5;
    return devices.map(device => {
      const isAlarm = alarmIds.has(device.device_id);
      const px = (device.x / 100) * imageSize.width;
      const py = (device.y / 100) * imageSize.height;
      const statusStr = isAlarm ? 'alarm' : device.status === 1 ? 'normal' : device.status === 2 ? 'fault' : device.status === 3 ? 'offline' : 'normal';

      return (
        <Group key={device.position_id}>
          {/* 烟感影响圈 */}
          {isAlarm && (device.device_type?.includes('烟感') || device.device_type?.includes('detector')) && (
            <Circle
              x={px}
              y={py}
              radius={60}
              stroke="#f59e0b"
              strokeWidth={2}
              dash={[6, 4]}
              opacity={0.3 + pulse * 0.2}
              listening={false}
            />
          )}
          <DeviceIcon
            x={px}
            y={py}
            category={device.device_type}
            status={statusStr}
            size={22}
            isAlarm={isAlarm}
            isSelected={selectedDevice?.position_id === device.position_id}
            pulse={pulse}
            draggable
            onDragEnd={(pos) => {
              const pctX = Math.max(0, Math.min(100, (pos.x / imageSize.width) * 100));
              const pctY = Math.max(0, Math.min(100, (pos.y / imageSize.height) * 100));
              api.post(`/floors/${selectedFloor}/devices`, {
                device_id: device.device_id, x: pctX, y: pctY,
              }).then(() => { if (selectedFloor) loadFloorData(selectedFloor); });
            }}
            onClick={() => handleDeviceClick(device)}
            onMouseEnter={() => {
              setHoverDevice(device);
              setMousePos({ x: px, y: py });
            }}
            onMouseLeave={() => setHoverDevice(null)}
          />
          {/* 设备名称标签 */}
          <Text
            text={device.device_name}
            fontSize={10}
            fill="#e2e8f0"
            x={px - 40}
            y={py + 14}
            width={80}
            align="center"
            padding={2}
          />
        </Group>
      );
    });
  };

  /* ═══════ 渲染：摄像头节点 ═══════ */
  const renderCameraNodes = () => {
    return cameras.map(cam => {
      const px = (cam.x / 100) * imageSize.width;
      const py = (cam.y / 100) * imageSize.height;
      return (
        <Group key={`cam-${cam.id}`} x={px} y={py}>
          <Circle radius={8} fill="#6366f1" stroke="#fff" strokeWidth={2} />
          <Text text="◎" fontSize={10} fill="#fff" x={-5} y={-5} />
          <Text
            text={cam.camera_name || `摄像头${cam.camera_device_id.slice(-4)}`}
            fontSize={10} fill="#a5b4fc" y={12} x={-35} width={70} align="center"
          />
        </Group>
      );
    });
  };

  /* ═══════ 渲染：主布局 ═══════ */
  const currentBatchDevice = batchQueue[batchIndex];

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* ═══ 顶部工具栏 ═══ */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Layout className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-slate-100">建筑平面图</h2>

        <select
          className="h-8 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
          value={selectedUnit}
          onChange={e => { setSelectedUnit(e.target.value); setSelectedBuilding(null); setSelectedFloor(null); }}
        >
          <option value="">选择单位</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          className="h-8 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
          value={selectedBuilding || ''}
          onChange={e => setSelectedBuilding(+e.target.value || null)}
          disabled={!selectedUnit}
        >
          <option value="">选择建筑物</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          className="h-8 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
          value={selectedFloor || ''}
          onChange={e => setSelectedFloor(+e.target.value || null)}
          disabled={!selectedBuilding}
        >
          <option value="">选择楼层</option>
          {floors.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* 缩放控制 */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg border border-slate-700/30 p-0.5">
          <button onClick={() => setStageScale(s => Math.max(0.1, +(s - 0.1).toFixed(2)))}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-500 w-12 text-center">{Math.round(stageScale * 100)}%</span>
          <button onClick={() => setStageScale(s => Math.min(4, +(s + 0.1).toFixed(2)))}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="还原">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setSoundEnabled(v => !v)}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="声音">
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen?.();
              setIsFullscreen(true);
            } else {
              document.exitFullscreen?.();
              setIsFullscreen(false);
            }
          }}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="全屏">
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300"
          onClick={() => fileRef.current?.click()} disabled={!selectedFloor}>
          <Upload className="w-3 h-3 mr-1" />上传平面图
        </Button>

        <Button size="sm" className={`h-7 text-[10px] ${batchMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={() => batchMode ? setBatchMode(false) : startBatchMark()}
          disabled={unmarked.length === 0 || !selectedFloor}>
          {batchMode ? `连续标点 (${batchIndex + 1}/${batchQueue.length})` : '连续标点'}
        </Button>

        <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
        <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300"
          onClick={() => importRef.current?.click()} disabled={!selectedFloor || importLoading}>
          <FileSpreadsheet className="w-3 h-3 mr-1" />
          {importLoading ? '导入中...' : '导入Excel'}
        </Button>
      </div>

      {/* ═══ 主体三栏 ═══ */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ── 左侧：未标点设备 ── */}
        <Card className="w-64 flex-shrink-0 border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-3 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-xs font-medium text-slate-200">未标点设备</span>
              <Badge variant="outline" className="text-[9px] bg-slate-700/30 text-slate-400">{unmarked.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
              {unmarked.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                    activeDevice?.device_id === d.device_id ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-700/20 hover:bg-slate-700/40'
                  }`}
                  onClick={() => { setActiveDevice(d); setBatchMode(false); }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[d.status] || '#64748b' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-300 truncate">{d.device_name}</div>
                    <div className="text-[8px] text-slate-500">{d.device_code}</div>
                  </div>
                </div>
              ))}
              {unmarked.length === 0 && (
                <div className="text-center py-4 text-[10px] text-slate-600">暂无未标点设备</div>
              )}
            </div>
            {activeDevice && !batchMode && (
              <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">
                已选中：<b>{activeDevice.device_name}</b>，请在平面图上点击位置
                <button className="ml-2 text-slate-500 hover:text-slate-300" onClick={() => setActiveDevice(null)}>
                  <X className="w-3 h-3 inline" />
                </button>
              </div>
            )}
            {batchMode && currentBatchDevice && (
              <div className="mt-2 p-2 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400">
                连续标点：<b>{currentBatchDevice.device_name}</b> ({batchIndex + 1}/{batchQueue.length})
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 中间：Konva 画布 ── */}
        <Card className="flex-1 border-slate-700/50 bg-slate-900 flex flex-col relative overflow-hidden">
          <CardContent className="p-0 flex-1 relative" ref={containerRef}>
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80">
                <div className="text-xs text-slate-400">加载中...</div>
              </div>
            )}

            {!currentFloor?.plan_image_url ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                <Layers className="w-12 h-12 mb-3 opacity-30" />
                <div className="text-sm">请先选择楼层并上传平面图</div>
                <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-[10px]"
                  onClick={() => fileRef.current?.click()} disabled={!selectedFloor}>
                  <Upload className="w-3 h-3 mr-1" />上传平面图
                </Button>
              </div>
            ) : (
              <div className="absolute inset-0">
                <Stage
                  ref={stageRef}
                  width={stageSize.width}
                  height={stageSize.height}
                  scaleX={stageScale}
                  scaleY={stageScale}
                  x={stagePos.x}
                  y={stagePos.y}
                  draggable={false}
                  onWheel={handleWheel}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  onMouseLeave={handleStageMouseUp}
                  onClick={handleStageClick}
                  className={activeDevice || batchMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                >
                  <Layer>
                    {/* CAD 线条渲染 */}
                    {cadData && (
                      <CADRenderer
                        cadData={cadData}
                        width={imageSize.width}
                        height={imageSize.height}
                        strokeColor="#64748b"
                        strokeWidth={0.8}
                        opacity={0.6}
                      />
                    )}
                    {/* 背景图片（非 CAD 模式） */}
                    <Group>
                      {!cadData && imageObj && (
                        <Image
                          image={imageObj}
                          width={imageSize.width}
                          height={imageSize.height}
                          opacity={0.95}
                        />
                      )}
                      {/* 摄像头 */}
                      {renderCameraNodes()}
                      {/* 设备点位 */}
                      {renderDeviceNodes()}
                      {/* 悬浮提示 */}
                      {hoverDevice && (
                        <DeviceTooltip
                          x={mousePos.x}
                          y={mousePos.y}
                          device={{
                            device_code: hoverDevice.device_code,
                            device_name: hoverDevice.device_name,
                            device_type: hoverDevice.device_type,
                            status: alarmIds.has(hoverDevice.device_id) ? 'alarm'
                              : hoverDevice.status === 1 ? 'normal'
                              : hoverDevice.status === 2 ? 'fault' : 'offline',
                            location: currentFloor?.name || '',
                          }}
                        />
                      )}
                    </Group>
                  </Layer>
                </Stage>

                {/* 浮动提示 */}
                {(activeDevice || batchMode) && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 border border-slate-600/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] text-slate-300">
                      {batchMode
                        ? `连续标点：${currentBatchDevice?.device_name} (${batchIndex + 1}/${batchQueue.length})`
                        : `标点模式：${activeDevice?.device_name}`}
                    </span>
                  </div>
                )}

                {/* 告警提示 */}
                {stats.alarm > 0 && (
                  <div className="absolute bottom-3 left-3 z-50 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{stats.alarm} 个设备告警中</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 图例 */}
            <div className="absolute bottom-3 right-3 z-40 bg-slate-800/80 backdrop-blur border border-slate-700/30 rounded-lg px-2 py-1.5 flex items-center gap-3">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[+key] }} />
                  <span className="text-[9px] text-slate-400">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] text-red-400">告警</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 右侧：详情面板 ── */}
        <Card className="w-72 flex-shrink-0 border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-3 flex flex-col h-full">
            {!selectedDevice ? (
              <div className="flex-1 flex flex-col">
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: '已标点', value: stats.total, color: 'blue' },
                    { label: '在线', value: stats.online, color: 'emerald' },
                    { label: '故障', value: stats.fault, color: 'yellow' },
                    { label: '离线', value: stats.offline, color: 'red' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-700/20 rounded-lg p-2 text-center">
                      <div className={`text-lg font-bold text-${s.color}-400`}>{s.value}</div>
                      <div className="text-[9px] text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* 设备列表 */}
                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
                  <div className="text-[10px] text-slate-500 mb-1">楼层设备列表</div>
                  {devices.map(d => (
                    <div
                      key={d.position_id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/20 hover:bg-slate-700/40 cursor-pointer transition-all"
                      onClick={() => handleDeviceClick(d)}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[d.status] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-300 truncate">{d.device_name}</div>
                        <div className="text-[8px] text-slate-500">{d.device_type} · {STATUS_LABEL[d.status]}</div>
                      </div>
                      {alarmIds.has(d.device_id) && (
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {devices.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-slate-600">暂无设备标点</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-200">设备详情</h3>
                  <button onClick={() => setSelectedDevice(null)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto">
                  <div className="p-3 rounded-lg bg-slate-700/20">
                    <div className="text-[10px] text-slate-500">设备名称</div>
                    <div className="text-xs text-slate-200 font-medium">{selectedDevice.device_name}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/20">
                    <div className="text-[10px] text-slate-500">设备编码</div>
                    <div className="text-xs text-slate-200 font-mono">{selectedDevice.device_code}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/20 flex items-center gap-2">
                    <div className="text-[10px] text-slate-500">状态</div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[selectedDevice.status] }} />
                      <span className="text-xs" style={{ color: STATUS_COLOR[selectedDevice.status] }}>
                        {STATUS_LABEL[selectedDevice.status]}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/20">
                    <div className="text-[10px] text-slate-500">平面位置</div>
                    <div className="text-xs text-slate-200 font-mono">
                      X: {selectedDevice.x.toFixed(1)}% / Y: {selectedDevice.y.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/20">
                    <div className="text-[10px] text-slate-500">设备类型</div>
                    <div className="text-xs text-slate-200">{selectedDevice.device_type || '-'}</div>
                  </div>

                  {/* 视频联动 */}
                  {showVideo && linkedCamera && (
                    <div className="p-3 rounded-lg bg-slate-700/20 border border-indigo-500/30">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-indigo-400 font-medium">关联摄像头</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        {linkedCamera.camera_name || `摄像头 ${linkedCamera.camera_device_id.slice(-6)}`}
                      </div>
                      {linkedCamera.preset_no > 0 && (
                        <div className="text-[10px] text-slate-500">预置位: {linkedCamera.preset_no}</div>
                      )}
                      {linkedCamera.stream_url ? (
                        <video
                          src={linkedCamera.stream_url}
                          autoPlay
                          muted
                          controls
                          className="w-full h-32 rounded bg-black mt-2 object-contain"
                        />
                      ) : (
                        <div className="w-full h-24 rounded bg-slate-900 flex items-center justify-center text-[10px] text-slate-600 mt-2">
                          暂无视频流
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1" />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] border-slate-600 text-slate-300"
                    onClick={() => { /* 跳转设备档案 */ }}>
                    <Eye className="w-3 h-3 mr-1" />查看档案
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => deletePosition(selectedDevice.position_id)}>
                    <Trash2 className="w-3 h-3 mr-1" />删除点位
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 视频联动弹窗 */}
      <VideoPopup
        open={videoPopupOpen}
        cameraId={videoPopupCameraId}
        cameraName={videoPopupCameraName}
        onClose={() => setVideoPopupOpen(false)}
      />

      {/* Excel 导入结果弹窗 */}
      {importResult && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={() => setImportResult(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-96 max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">导入结果</h3>
              <button onClick={() => setImportResult(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-slate-700/30 rounded p-2 text-center">
                <div className="text-sm font-bold text-slate-200">{importResult.total}</div>
                <div className="text-[9px] text-slate-500">总计</div>
              </div>
              <div className="bg-emerald-500/10 rounded p-2 text-center">
                <div className="text-sm font-bold text-emerald-400">{importResult.success}</div>
                <div className="text-[9px] text-emerald-500/70">成功</div>
              </div>
              <div className="bg-red-500/10 rounded p-2 text-center">
                <div className="text-sm font-bold text-red-400">{importResult.failed}</div>
                <div className="text-[9px] text-red-500/70">失败</div>
              </div>
            </div>
            {importResult.unmatched.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-slate-500 mb-1">未匹配编码：</div>
                <div className="max-h-24 overflow-y-auto scrollbar-thin bg-slate-900/50 rounded p-2 text-[10px] text-red-400 leading-relaxed">
                  {importResult.unmatched.join(', ')}
                </div>
              </div>
            )}
            <Button size="sm" className="w-full h-8 text-[10px] bg-blue-600 hover:bg-blue-700" onClick={() => setImportResult(null)}>确定</Button>
          </div>
        </div>
      )}
    </div>
  );
}
