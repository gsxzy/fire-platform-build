import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layout, Search, ZoomIn, ZoomOut, RotateCcw,
  RefreshCw, Maximize2, Volume2, VolumeX,
  Maximize, Minimize, Upload, FileSpreadsheet, Plus,
} from 'lucide-react';
import type { Unit, Building, Floor } from '../types';

interface ToolbarProps {
  units: Unit[];
  selectedUnit: string;
  onSelectUnit: (v: string) => void;
  buildings: Building[];
  selectedBuilding: number | null;
  onSelectBuilding: (v: number | null) => void;
  floors: Floor[];
  selectedFloor: number | null;
  onSelectFloor: (v: number | null) => void;
  deviceSearchQuery: string;
  onSearchChange: (v: string) => void;
  stageScale: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetView: () => void;
  onRefresh: () => void;
  onFitPlan: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  loading: boolean;
  hasPlanCanvas: boolean;
  onUploadClick: () => void;
  canUpload: boolean;
  batchMode: boolean;
  onToggleBatch: () => void;
  canBatch: boolean;
  onImportClick: () => void;
  canImport: boolean;
  importLoading: boolean;
  onAddBuilding: () => void;
  canAddBuilding: boolean;
}

export default function Toolbar({
  units, selectedUnit, onSelectUnit,
  buildings, selectedBuilding, onSelectBuilding,
  floors, selectedFloor, onSelectFloor,
  deviceSearchQuery, onSearchChange,
  stageScale, onZoomOut, onZoomIn, onResetView,
  onRefresh, onFitPlan,
  soundEnabled, onToggleSound,
  isFullscreen, onToggleFullscreen,
  loading, hasPlanCanvas,
  onUploadClick, canUpload,
  batchMode, onToggleBatch, canBatch,
  onImportClick, canImport, importLoading,
  onAddBuilding, canAddBuilding,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <Layout className="w-5 h-5 text-blue-400" />
      <h2 className="text-base font-bold text-slate-100">建筑平面图</h2>

      <select
        className="h-8 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
        value={selectedUnit}
        onChange={e => onSelectUnit(e.target.value)}
      >
        <option value="">选择单位</option>
        {units.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <select
          className="h-8 min-w-[132px] px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
          value={selectedBuilding || ''}
          onChange={e => onSelectBuilding(+e.target.value || null)}
          disabled={!selectedUnit}
        >
          <option value="">选择建筑物</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-slate-600 text-slate-300 hover:bg-slate-700"
          disabled={!canAddBuilding}
          title="添加建筑"
          onClick={onAddBuilding}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <select
        className="h-8 px-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500"
        value={selectedFloor || ''}
        onChange={e => onSelectFloor(+e.target.value || null)}
        disabled={!selectedBuilding}
      >
        <option value="">选择楼层</option>
        {floors.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <div className="relative flex items-center">
        <Search className="absolute left-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <Input
          value={deviceSearchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="筛选设备…"
          disabled={!selectedFloor}
          className="h-8 w-36 pl-8 text-[10px] bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      <div className="flex-1" />

      {/* 缩放控制 */}
      <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg border border-slate-700/30 p-0.5">
        <button onClick={onZoomOut}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-slate-500 w-12 text-center">{Math.round(stageScale * 100)}%</span>
        <button onClick={onZoomIn}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={onResetView}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="还原">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!selectedFloor || loading}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded disabled:opacity-40"
          title="刷新本层数据"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onFitPlan}
          disabled={!hasPlanCanvas}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded disabled:opacity-40"
          title="平面图适配画布"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleSound}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="声音">
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onToggleFullscreen}
          className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded" title="全屏">
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
      </div>

      <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300"
        onClick={onUploadClick} disabled={!canUpload}>
        <Upload className="w-3 h-3 mr-1" />上传平面图
      </Button>

      <Button size="sm" className={`h-7 text-[10px] ${batchMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        onClick={onToggleBatch}
        disabled={!canBatch}>
        {batchMode ? '退出标点' : '连续标点'}
      </Button>

      <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300"
        onClick={onImportClick} disabled={!canImport || importLoading}>
        <FileSpreadsheet className="w-3 h-3 mr-1" />
        {importLoading ? '导入中...' : '导入Excel'}
      </Button>
    </div>
  );
}
