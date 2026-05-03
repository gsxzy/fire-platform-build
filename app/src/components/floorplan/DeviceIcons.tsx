/**
 * 消防设备标准图标 - 对标海湾GST/海康消防/防火云
 * 使用 Konva Path 渲染 SVG 路径
 */
import { Path, Group, Circle, Text } from 'react-konva';

export const DEVICE_STATUS_COLOR: Record<string, string> = {
  normal: '#22c55e',   // 正常在线=绿色
  online: '#22c55e',
  fault: '#eab308',    // 故障=黄色
  offline: '#9ca3af',  // 离线=灰色
  shield: '#a855f7',   // 屏蔽=紫色
  alarm: '#ef4444',    // 火警/告警=红色
  fire: '#ef4444',
};

export const DEVICE_STATUS_LABEL: Record<string, string> = {
  normal: '正常', online: '在线', fault: '故障', offline: '离线',
  shield: '屏蔽', alarm: '告警', fire: '火警',
};

// SVG Path 数据 - 简化版行业标准图标
const ICON_PATHS: Record<string, string> = {
  // 烟感探测器 - 圆形 + 波浪线
  detector: 'M -8,-8 A 8,8 0 1,1 8,-8 A 8,8 0 1,1 -8,-8 M -5,0 Q 0,-4 5,0',
  // 温感探测器 - 圆形 + 温度计
  heat: 'M -8,-8 A 8,8 0 1,1 8,-8 A 8,8 0 1,1 -8,-8 M -1,-4 L -1,2 M -1,2 A 3,3 0 1,0 1,2 L 1,-4',
  // 手动报警按钮 - 方形 + 手形
  button: 'M -7,-8 L 7,-8 L 7,8 L -7,8 Z M -3,2 L 0,-1 L 3,2 L 3,5 L -3,5 Z',
  // 声光报警器 - 三角形 + 闪电
  alarm: 'M 0,-9 L 8,6 L -8,6 Z M 0,-3 L 2,1 L -1,1 L 1,5',
  // 消火栓 - 方形 + H
  hydrant: 'M -7,-8 L 7,-8 L 7,8 L -7,8 Z M -3,-2 L -3,4 M 3,-2 L 3,4 M -3,1 L 3,1',
  // 消防泵 - 圆形 + P
  pump: 'M -8,-8 A 8,8 0 1,1 8,-8 A 8,8 0 1,1 -8,-8 M -3,-4 L 3,-4 L 3,0 L -1,0 L 3,4',
  // 风机 - 圆形 + 风扇叶
  fan: 'M -8,-8 A 8,8 0 1,1 8,-8 A 8,8 0 1,1 -8,-8 M 0,-5 L 3,-2 L 0,1 L -3,-2 Z',
  // 防火门 - 门形
  door: 'M -6,-8 L 6,-8 L 6,8 L -6,8 Z M 4,-8 L 4,8',
  // 电气火灾 - 闪电
  elec: 'M -2,-8 L 4,-1 L 0,-1 L 3,8 L -4,0 L 0,0 Z',
  // 摄像头 - 摄像机形
  camera: 'M -6,-5 L 4,-5 L 6,-8 L 6,8 L 4,5 L -6,5 Z M 6,0 L 10,0',
  // 压力/液位 - 波浪线
  pressure: 'M -8,-2 Q -4,2 0,-2 Q 4,2 8,-2 M -8,2 Q -4,6 0,2 Q 4,6 8,2',
  // 报警主机 - 大方形 + 网格
  host: 'M -9,-7 L 9,-7 L 9,7 L -9,7 Z M -3,-7 L -3,7 M 3,-7 L 3,7 M -9,-2 L 9,-2 M -9,2 L 9,2',
  // 默认
  default: 'M -6,-6 A 6,6 0 1,1 6,-6 A 6,6 0 1,1 -6,-6',
};

function mapCategoryToIcon(category?: string): string {
  if (!category) return 'default';
  const c = category.toLowerCase();
  if (c.includes('detector') || c.includes('烟感')) return 'detector';
  if (c.includes('heat') || c.includes('温感')) return 'heat';
  if (c.includes('button') || c.includes('手报')) return 'button';
  if (c.includes('alarm') || c.includes('声光')) return 'alarm';
  if (c.includes('hydrant') || c.includes('消火栓')) return 'hydrant';
  if (c.includes('pump') || c.includes('泵')) return 'pump';
  if (c.includes('fan') || c.includes('风机')) return 'fan';
  if (c.includes('door') || c.includes('门')) return 'door';
  if (c.includes('elec') || c.includes('电气')) return 'elec';
  if (c.includes('camera') || c.includes('摄像')) return 'camera';
  if (c.includes('pressure') || c.includes('液位') || c.includes('压力')) return 'pressure';
  if (c.includes('host') || c.includes('主机')) return 'host';
  return 'default';
}

interface DeviceIconProps {
  x: number;
  y: number;
  category?: string;
  status?: string;
  size?: number;
  isAlarm?: boolean;
  isSelected?: boolean;
  pulse?: number; // 0-1 告警脉冲值
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  draggable?: boolean;
}

export function DeviceIcon({
  x, y, category, status = 'normal', size = 24,
  isAlarm = false, isSelected = false, pulse = 0,
  onClick, onMouseEnter, onMouseLeave, onDragEnd, draggable = false,
}: DeviceIconProps) {
  const iconKey = mapCategoryToIcon(category);
  const pathData = ICON_PATHS[iconKey] || ICON_PATHS.default;
  const color = DEVICE_STATUS_COLOR[status] || DEVICE_STATUS_COLOR.normal;
  const scale = size / 20;

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragEnd={(e: any) => {
        const pos = e.target.position();
        onDragEnd?.({ x: pos.x, y: pos.y });
      }}
    >
      {/* 告警光环 */}
      {isAlarm && (
        <Circle
          radius={size * 0.8 + pulse * size * 0.6}
          fill="rgba(239,68,68,0.15)"
          stroke="rgba(239,68,68,0.4)"
          strokeWidth={1 + pulse * 2}
        />
      )}

      {/* 选中高亮 */}
      {isSelected && (
        <Circle
          radius={size * 0.6}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 2]}
        />
      )}

      {/* 背景圆 */}
      <Circle
        radius={size * 0.5}
        fill={isAlarm ? '#fef2f2' : '#1e293b'}
        stroke={color}
        strokeWidth={isAlarm ? 3 : 2}
      />

      {/* 图标路径 */}
      <Path
        data={pathData}
        scaleX={scale}
        scaleY={scale}
        stroke={isAlarm ? '#ef4444' : color}
        strokeWidth={1.5}
        fill={isAlarm ? '#ef4444' : 'transparent'}
        fillOpacity={isAlarm ? 0.2 : 0}
      />
    </Group>
  );
}

// 悬浮提示信息组件
export function DeviceTooltip({
  x, y, device,
}: {
  x: number;
  y: number;
  device: {
    device_code?: string;
    device_name?: string;
    device_type?: string;
    status?: string;
    location?: string;
  };
}) {
  const color = DEVICE_STATUS_COLOR[device.status || 'normal'];
  const label = DEVICE_STATUS_LABEL[device.status || 'normal'];
  const width = 180;
  const height = 80;

  return (
    <Group x={x + 15} y={y - height / 2}>
      <Path
        data={`M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`}
        fill="rgba(15,23,42,0.95)"
        stroke="rgba(100,116,139,0.5)"
        strokeWidth={1}
      />
      <Text
        text={device.device_name || '未知设备'}
        x={10}
        y={8}
        fontSize={12}
        fontStyle="bold"
        fill="#f1f5f9"
      />
      <Text
        text={`编号: ${device.device_code || '-'}`}
        x={10}
        y={26}
        fontSize={10}
        fill="#94a3b8"
      />
      <Text
        text={`位置: ${device.location || '-'}`}
        x={10}
        y={42}
        fontSize={10}
        fill="#94a3b8"
      />
      <Text
        text={label}
        x={width - 50}
        y={8}
        fontSize={10}
        fill={color}
        fontStyle="bold"
      />
    </Group>
  );
}
