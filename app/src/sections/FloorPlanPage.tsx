import { Stage, Layer, Image, Circle, Text, Group } from 'react-konva';
import { floorPlanService as api } from '@/api/services';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crosshair, Loader2, Layers, Upload } from 'lucide-react';
import { DeviceIcon, DeviceTooltip } from '@/components/floorplan/DeviceIcons';
import VideoPopup from '@/components/floorplan/VideoPopup';
import CADRenderer from '@/components/floorplan/CADRenderer';

import { useFloorPlan } from './floorPlan/hooks';
import Toolbar from './floorPlan/components/Toolbar';
import LeftPanel from './floorPlan/components/LeftPanel';
import RightPanel from './floorPlan/components/RightPanel';
import AddBuildingDialog from './floorPlan/components/AddBuildingDialog';
import ImportResultModal from './floorPlan/components/ImportResultModal';

export default function FloorPlanPage() {
  const fp = useFloorPlan();

  /* ═══════ 渲染：设备点位 ═══════ */
  const renderDeviceNodes = () => {
    const pulse = Math.sin(fp.tick * 0.6) * 0.5 + 0.5;
    return fp.devices.map(device => {
      const isAlarm = fp.alarmIds.has(device.device_id);
      const px = (device.x / 100) * fp.imageSize.width;
      const py = (device.y / 100) * fp.imageSize.height;
      const statusStr = isAlarm ? 'alarm'
        : device.status === 1 ? 'normal'
        : device.status === 2 ? 'fault'
        : device.status === 3 ? 'offline' : 'normal';

      return (
        <Group key={device.position_id}>
          {isAlarm && (device.device_type?.includes('烟感') || device.device_type?.includes('detector')) && (
            <Circle
              x={px} y={py} radius={60}
              stroke="#f59e0b" strokeWidth={2} dash={[6, 4]}
              opacity={0.3 + pulse * 0.2}
              listening={false}
            />
          )}
          <DeviceIcon
            x={px} y={py}
            category={device.device_type}
            status={statusStr}
            size={22}
            isAlarm={isAlarm}
            isSelected={fp.selectedDevice?.position_id === device.position_id}
            pulse={pulse}
            draggable
            onDragEnd={(pos) => {
            const px = Math.max(0, Math.min(100, (pos.x / fp.imageSize.width) * 100));
            const py = Math.max(0, Math.min(100, (pos.y / fp.imageSize.height) * 100));
            void api.post(`/floors/${fp.selectedFloor}/devices`, {
              device_id: device.device_id, x: px, y: py,
            }).then(() => { if (fp.selectedFloor) fp.loadFloorData(fp.selectedFloor); });
          }}
            onClick={() => fp.handleDeviceClick(device)}
            onMouseEnter={() => {
              fp.setHoverDevice(device);
              fp.setMousePos({ x: px, y: py });
            }}
            onMouseLeave={() => fp.setHoverDevice(null)}
          />
          <Text
            text={device.device_name}
            fontSize={10} fill="#e2e8f0"
            x={px - 40} y={py + 14}
            width={80} align="center" padding={2}
          />
        </Group>
      );
    });
  };

  /* ═══════ 渲染：摄像头节点 ═══════ */
  const renderCameraNodes = () => {
    return fp.cameras.map(cam => {
      const px = (cam.x / 100) * fp.imageSize.width;
      const py = (cam.y / 100) * fp.imageSize.height;
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

  const STATUS_COLOR: Record<number, string> = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444', 4: '#64748b' };
  const STATUS_LABEL: Record<number, string> = { 1: '在线', 2: '故障', 3: '离线', 4: '报废' };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* ═══ 顶部工具栏 ═══ */}
      <Toolbar
        units={fp.units}
        selectedUnit={fp.selectedUnit}
        onSelectUnit={(v) => { fp.setSelectedUnit(v); fp.setSelectedBuilding(null); fp.setSelectedFloor(null); }}
        buildings={fp.buildings}
        selectedBuilding={fp.selectedBuilding}
        onSelectBuilding={fp.setSelectedBuilding}
        floors={fp.floors}
        selectedFloor={fp.selectedFloor}
        onSelectFloor={fp.setSelectedFloor}
        deviceSearchQuery={fp.deviceSearchQuery}
        onSearchChange={fp.setDeviceSearchQuery}
        stageScale={fp.stageScale}
        onZoomOut={() => fp.setStageScale(s => Math.max(0.1, +(s - 0.1).toFixed(2)))}
        onZoomIn={() => fp.setStageScale(s => Math.min(4, +(s + 0.1).toFixed(2)))}
        onResetView={() => { fp.setStageScale(1); fp.setStagePos({ x: 0, y: 0 }); }}
        onRefresh={() => fp.selectedFloor && fp.loadFloorData(fp.selectedFloor)}
        onFitPlan={fp.fitPlanToStage}
        soundEnabled={fp.soundEnabled}
        onToggleSound={() => fp.setSoundEnabled(v => !v)}
        isFullscreen={fp.isFullscreen}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            fp.setIsFullscreen(true);
          } else {
            document.exitFullscreen?.();
            fp.setIsFullscreen(false);
          }
        }}
        loading={fp.loading}
        hasPlanCanvas={fp.hasPlanCanvas}
        onUploadClick={() => fp.fileRef.current?.click()}
        canUpload={!!fp.selectedFloor}
        batchMode={fp.batchMode}
        onToggleBatch={() => fp.batchMode ? fp.setBatchMode(false) : fp.startBatchMark()}
        canBatch={fp.unmarked.length > 0 && !!fp.selectedFloor}
        onImportClick={() => fp.importRef.current?.click()}
        canImport={!!fp.selectedFloor}
        importLoading={fp.importLoading}
        onAddBuilding={() => { fp.setNewBuilding({ name: '', type: '商业', total_floors: 1, address: '' }); fp.setAddBuildingOpen(true); }}
        canAddBuilding={!!fp.selectedUnit}
      />

      {/* hidden file inputs */}
      <input ref={fp.fileRef} type="file" accept="image/*" className="hidden" onChange={fp.handleUpload} />
      <input ref={fp.importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={fp.handleImportExcel} />

      {/* ═══ 主体三栏 ═══ */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ── 左侧：未标点设备 ── */}
        <LeftPanel
          unmarked={fp.unmarked}
          filteredUnmarked={fp.filteredUnmarked}
          activeDevice={fp.activeDevice}
          batchMode={fp.batchMode}
          batchIndex={fp.batchIndex}
          batchQueue={fp.batchQueue}
          onSelectDevice={(d) => { fp.setActiveDevice(d); fp.setBatchMode(false); }}
          onClearActive={() => fp.setActiveDevice(null)}
        />

        {/* ── 中间：Konva 画布 ── */}
        <Card className="flex-1 border-slate-700/50 bg-slate-900 flex flex-col relative overflow-hidden">
          <CardContent className="p-0 flex-1 relative" ref={fp.containerRef}>
            {fp.loading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-slate-900/80">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                <div className="text-xs text-slate-400">平面图与设备点位加载中，请稍候…</div>
              </div>
            )}

            {!fp.hasPlanCanvas ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                <Layers className="w-12 h-12 mb-3 opacity-30" />
                <div className="text-sm text-center px-4">
                  {fp.currentFloor?.plan_type === 'cad' && !fp.cadData
                    ? '本层为 CAD 图纸，但未解析到有效矢量数据。请检查楼层 CAD 导入或改上传栅格平面图。'
                    : '请先选择楼层并上传平面图，或使用已导入的 CAD 矢量图纸。'}
                </div>
                <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-[10px]"
                  onClick={() => fp.fileRef.current?.click()} disabled={!fp.selectedFloor}>
                  <Upload className="w-3 h-3 mr-1" />上传平面图
                </Button>
              </div>
            ) : (
              <div className="absolute inset-0">
                <Stage
                  ref={fp.stageRef}
                  width={fp.stageSize.width}
                  height={fp.stageSize.height}
                  scaleX={fp.stageScale}
                  scaleY={fp.stageScale}
                  x={fp.stagePos.x}
                  y={fp.stagePos.y}
                  draggable={false}
                  onWheel={fp.handleWheel}
                  onMouseDown={fp.handleStageMouseDown}
                  onMouseMove={fp.handleStageMouseMove}
                  onMouseUp={fp.handleStageMouseUp}
                  onMouseLeave={fp.handleStageMouseUp}
                  onClick={fp.handleStageClick}
                  className={fp.activeDevice || fp.batchMode ? 'cursor-crosshair' : fp.isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                >
                  <Layer>
                    {fp.cadData && (
                      <CADRenderer
                        cadData={fp.cadData}
                        width={fp.imageSize.width}
                        height={fp.imageSize.height}
                        strokeColor="#64748b"
                        strokeWidth={0.8}
                        opacity={0.6}
                      />
                    )}
                    <Group>
                      {!fp.cadData && fp.imageObj && (
                        <Image
                          image={fp.imageObj}
                          width={fp.imageSize.width}
                          height={fp.imageSize.height}
                          opacity={0.95}
                        />
                      )}
                      {renderCameraNodes()}
                      {renderDeviceNodes()}
                      {fp.hoverDevice && (
                        <DeviceTooltip
                          x={fp.mousePos.x}
                          y={fp.mousePos.y}
                          device={{
                            device_code: fp.hoverDevice.device_code,
                            device_name: fp.hoverDevice.device_name,
                            device_type: fp.hoverDevice.device_type,
                            status: fp.alarmIds.has(fp.hoverDevice.device_id) ? 'alarm'
                              : fp.hoverDevice.status === 1 ? 'normal'
                              : fp.hoverDevice.status === 2 ? 'fault' : 'offline',
                            location: fp.currentFloor?.name || '',
                          }}
                        />
                      )}
                    </Group>
                  </Layer>
                </Stage>

                {(fp.activeDevice || fp.batchMode) && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 border border-slate-600/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] text-slate-300">
                      {fp.batchMode
                        ? `连续标点：${fp.batchQueue[fp.batchIndex]?.device_name} (${fp.batchIndex + 1}/${fp.batchQueue.length}) · Esc 退出`
                        : `标点模式：${fp.activeDevice?.device_name} · Esc 取消`}
                    </span>
                  </div>
                )}

                {fp.stats.alarm > 0 && (
                  <div className="absolute bottom-3 left-3 z-50 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{fp.stats.alarm} 个设备告警中</span>
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
        <RightPanel
          selectedDevice={fp.selectedDevice}
          devices={fp.devices}
          filteredDevices={fp.filteredDevices}
          alarmIds={fp.alarmIds}
          showVideo={fp.showVideo}
          linkedCamera={fp.linkedCamera}
          onSelectDevice={fp.handleDeviceClick}
          onClearDevice={() => fp.setSelectedDevice(null)}
          onDeletePosition={fp.deletePosition}
        />
      </div>

      <AddBuildingDialog
        open={fp.addBuildingOpen}
        onOpenChange={fp.setAddBuildingOpen}
        name={fp.newBuilding.name}
        onNameChange={(v) => fp.setNewBuilding(p => ({ ...p, name: v }))}
        type={fp.newBuilding.type}
        onTypeChange={(v) => fp.setNewBuilding(p => ({ ...p, type: v }))}
        totalFloors={fp.newBuilding.total_floors}
        onTotalFloorsChange={(v) => fp.setNewBuilding(p => ({ ...p, total_floors: v }))}
        address={fp.newBuilding.address}
        onAddressChange={(v) => fp.setNewBuilding(p => ({ ...p, address: v }))}
        loading={fp.addBuildingLoading}
        onSubmit={fp.submitNewBuilding}
      />

      <VideoPopup
        open={fp.videoPopupOpen}
        cameraId={fp.videoPopupCameraId}
        channelId={fp.videoPopupChannelId}
        cameraName={fp.videoPopupCameraName}
        onClose={() => fp.setVideoPopupOpen(false)}
      />

      <ImportResultModal
        result={fp.importResult}
        onClose={() => fp.setImportResult(null)}
      />
    </div>
  );
}
