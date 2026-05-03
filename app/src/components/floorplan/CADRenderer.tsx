/**
 * CAD 图纸线条渲染组件
 * 将后端解析的 JSON 线条数据渲染为 Konva 图形
 */
import { useMemo } from 'react';
import { Group, Line, Circle as KonvaCircle, Text } from 'react-konva';

interface CADLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CADCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

interface CADArc {
  type: 'arc';
  cx: number;
  cy: number;
  r: number;
  start_angle: number;
  end_angle: number;
}

interface CADText {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

interface CADData {
  lines?: CADLine[];
  circles?: CADCircle[];
  arcs?: CADArc[];
  texts?: CADText[];
  bounds?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
  };
}

interface CADRendererProps {
  cadData: CADData;
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

export default function CADRenderer({
  cadData, width, height,
  strokeColor = '#475569',
  strokeWidth = 0.8,
  opacity = 0.7,
}: CADRendererProps) {
  const { scaleX, scaleY, offsetX, offsetY } = useMemo(() => {
    if (!cadData.bounds) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    const { minx, miny, maxx, maxy } = cadData.bounds;
    const bw = maxx - minx || 1;
    const bh = maxy - miny || 1;
    const sx = width / bw;
    const sy = height / bh;
    const s = Math.min(sx, sy);
    return {
      scaleX: s,
      scaleY: -s, // CAD 坐标系 Y 轴向上，屏幕 Y 轴向下，需要翻转
      offsetX: -minx * s,
      offsetY: height + miny * s,
    };
  }, [cadData.bounds, width, height]);

  if (!cadData) return null;

  return (
    <Group opacity={opacity}>
      {/* 线条 */}
      {cadData.lines?.map((line, i) => (
        <Line
          key={`l-${i}`}
          points={[
            line.x1 * scaleX + offsetX,
            line.y1 * scaleY + offsetY,
            line.x2 * scaleX + offsetX,
            line.y2 * scaleY + offsetY,
          ]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      ))}

      {/* 圆形 */}
      {cadData.circles?.map((c, i) => (
        <KonvaCircle
          key={`c-${i}`}
          x={c.cx * scaleX + offsetX}
          y={c.cy * scaleY + offsetY}
          radius={c.r * Math.abs(scaleX)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      ))}

      {/* 文字 */}
      {cadData.texts?.map((t, i) => (
        <Text
          key={`t-${i}`}
          x={t.x * scaleX + offsetX}
          y={t.y * scaleY + offsetY}
          text={t.text}
          fontSize={10}
          fill={strokeColor}
        />
      ))}
    </Group>
  );
}
