#!/usr/bin/env python3
"""
CAD 图纸解析脚本
支持格式: DXF, DWG (ezdxf 会自动将 DWG 转换为 DXF)
输出: JSON 线条数据
用法: python parse_cad.py <input.dxf|input.dwg> <output.json>
"""
import sys
import json
import os

def parse_cad(input_path, output_path):
    try:
        import ezdxf
    except ImportError:
        print(json.dumps({"error": "ezdxf not installed"}))
        sys.exit(1)

    if not os.path.exists(input_path):
        print(json.dumps({"error": f"file not found: {input_path}"}))
        sys.exit(1)

    try:
        doc = ezdxf.readfile(input_path)
    except Exception as e:
        print(json.dumps({"error": f"read file failed: {str(e)}"}))
        sys.exit(1)

    msp = doc.modelspace()
    lines = []
    polylines = []
    circles = []
    arcs = []
    texts = []

    for entity in msp:
        dtype = entity.dxftype()
        try:
            if dtype == 'LINE':
                lines.append({
                    'type': 'line',
                    'x1': round(float(entity.dxf.start.x), 4),
                    'y1': round(float(entity.dxf.start.y), 4),
                    'x2': round(float(entity.dxf.end.x), 4),
                    'y2': round(float(entity.dxf.end.y), 4),
                })
            elif dtype == 'LWPOLYLINE':
                pts = entity.get_points('xy')
                for i in range(len(pts) - 1):
                    polylines.append({
                        'type': 'line',
                        'x1': round(float(pts[i][0]), 4),
                        'y1': round(float(pts[i][1]), 4),
                        'x2': round(float(pts[i+1][0]), 4),
                        'y2': round(float(pts[i+1][1]), 4),
                    })
            elif dtype == 'CIRCLE':
                circles.append({
                    'type': 'circle',
                    'cx': round(float(entity.dxf.center.x), 4),
                    'cy': round(float(entity.dxf.center.y), 4),
                    'r': round(float(entity.dxf.radius), 4),
                })
            elif dtype == 'ARC':
                arcs.append({
                    'type': 'arc',
                    'cx': round(float(entity.dxf.center.x), 4),
                    'cy': round(float(entity.dxf.center.y), 4),
                    'r': round(float(entity.dxf.radius), 4),
                    'start_angle': round(float(entity.dxf.start_angle), 2),
                    'end_angle': round(float(entity.dxf.end_angle), 2),
                })
            elif dtype == 'TEXT':
                texts.append({
                    'type': 'text',
                    'x': round(float(entity.dxf.insert.x), 4),
                    'y': round(float(entity.dxf.insert.y), 4),
                    'text': str(entity.dxf.text),
                })
        except Exception:
            continue

    # 计算边界框
    all_x = []
    all_y = []
    for l in lines + polylines:
        all_x.extend([l['x1'], l['x2']])
        all_y.extend([l['y1'], l['y2']])
    for c in circles + arcs:
        all_x.extend([c['cx'] - c['r'], c['cx'] + c['r']])
        all_y.extend([c['cy'] - c['r'], c['cy'] + c['r']])
    for t in texts:
        all_x.append(t['x'])
        all_y.append(t['y'])

    bounds = None
    if all_x and all_y:
        bounds = {
            'minx': round(min(all_x), 4),
            'miny': round(min(all_y), 4),
            'maxx': round(max(all_x), 4),
            'maxy': round(max(all_y), 4),
        }

    result = {
        'lines': lines + polylines,
        'circles': circles,
        'arcs': arcs,
        'texts': texts,
        'bounds': bounds,
        'count': {
            'lines': len(lines),
            'polylines': len(polylines),
            'circles': len(circles),
            'arcs': len(arcs),
            'texts': len(texts),
        }
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)

    print(json.dumps({"success": True, "output": output_path, "bounds": bounds}))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: parse_cad.py <input.dxf> <output.json>"}))
        sys.exit(1)
    parse_cad(sys.argv[1], sys.argv[2])
