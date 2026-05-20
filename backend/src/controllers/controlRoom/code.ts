import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/respond';
import { fail } from '@/utils/response';
import { ControlRoomHost, HostDeviceCode } from '@/models';
import logger from '@/config/logger';

export async function hostDeviceCodeList(req: Request, res: Response) {
  try {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    const { hostId, roomId, keyword, status } = req.query;
    const where: any = {};
    if (hostId) where.host_id = hostId;
    if (status !== undefined && status !== '') where.status = status;
    if (keyword) {
      where[Op.or] = [
        { device_name: { [Op.like]: `%${keyword}%` } },
        { install_location: { [Op.like]: `%${keyword}%` } },
        { device_type: { [Op.like]: `%${keyword}%` } },
        { parent_device: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (roomId && !hostId) {
      const hosts = await ControlRoomHost.findAll({
        where: { room_id: roomId },
        attributes: ['id'],
        raw: true,
      });
      const hostIds = hosts.map((h: any) => h.id);
      if (hostIds.length) where.host_id = { [Op.in]: hostIds };
      else where.host_id = -1;
    }
    const { count, rows } = await HostDeviceCode.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['loop_no', 'ASC'], ['point_no', 'ASC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDeviceCodeList 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDeviceCodeCreate(req: Request, res: Response) {
  try {
    const item = await HostDeviceCode.create(req.body as any);
    sendSuccess(res, req, { id: (item as any).id }, '创建成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDeviceCodeCreate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDeviceCodeUpdate(req: Request, res: Response) {
  try {
    await HostDeviceCode.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDeviceCodeUpdate 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDeviceCodeDelete(req: Request, res: Response) {
  try {
    await HostDeviceCode.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDeviceCodeDelete 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function hostDeviceCodeImport(req: Request, res: Response) {
  try {
    const { hostId } = req.body;
    if (!hostId) return res.status(400).json(fail('hostId 不能为空', 400));
    const file = (req as any).file;
    if (!file) return res.status(400).json(fail('请上传 Excel 文件', 400));

    const xlsx = await import('xlsx');
    const fs = await import('fs');
    let rows: unknown[][] = [];
    try {
      const workbook = xlsx.readFile(file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    } finally {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }

    if (!rows.length) return res.status(400).json(fail('Excel 为空', 400));

    const headerVariants: Record<string, string[]> = {
      loop_no: ['回路号', '回路', 'loop_no', 'loop no', 'loop', '回路编号'],
      point_no: ['点位号', '点位', 'point_no', 'point no', 'point', '地址', '设备地址', 'addr'],
      device_type: ['设备类型', '类型', 'device_type', 'device type', 'type'],
      device_name: ['设备名称', '名称', 'device_name', 'device name', 'name'],
      install_location: ['安装位置', '位置', 'install_location', 'location', '安装地点'],
      floor: ['楼层', 'floor', '层'],
      parent_device: ['父设备', 'parent_device', 'parent', '上级设备', '关联设备'],
      status: ['状态', 'status', '设备状态'],
    };

    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = (rows[i] || []).map(c => String(c).trim().toLowerCase());
      if (headerVariants.loop_no.some(h => row.includes(h.toLowerCase()))) {
        headerIdx = i;
        break;
      }
    }

    const headers = (rows[headerIdx] || []).map(c => String(c).trim().toLowerCase());
    const colIdx: Record<string, number> = {};
    for (const [key, variants] of Object.entries(headerVariants)) {
      colIdx[key] = headers.findIndex(h => variants.some(v => h.includes(v.toLowerCase())));
    }
    if (colIdx.loop_no < 0 || colIdx.point_no < 0) {
      return res.status(400).json(fail('未找到回路号或点位号列', 400));
    }

    const imports: any[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const loopNo = Number(row[colIdx.loop_no]);
      const pointNo = Number(row[colIdx.point_no]);
      if (!Number.isFinite(loopNo) || !Number.isFinite(pointNo) || loopNo < 0 || pointNo < 0) continue;

      const item: any = { host_id: hostId, loop_no: loopNo, point_no: pointNo };
      if (colIdx.device_type >= 0) item.device_type = String(row[colIdx.device_type] || '').trim() || null;
      if (colIdx.device_name >= 0) item.device_name = String(row[colIdx.device_name] || '').trim() || null;
      if (colIdx.install_location >= 0) item.install_location = String(row[colIdx.install_location] || '').trim() || null;
      if (colIdx.floor >= 0) item.floor = String(row[colIdx.floor] || '').trim() || null;
      if (colIdx.parent_device >= 0) item.parent_device = String(row[colIdx.parent_device] || '').trim() || null;
      if (colIdx.status >= 0) {
        const s = String(row[colIdx.status] || '').trim();
        if (['正常', '1', 'normal'].includes(s)) item.status = 1;
        else if (['故障', '2', 'fault'].includes(s)) item.status = 2;
        else if (['停用', '3', 'disabled', '停用'].includes(s)) item.status = 3;
        else item.status = 1;
      }
      imports.push(item);
    }

    if (imports.length === 0) return res.status(400).json(fail('未解析到有效数据', 400));

    let successCount = 0;
    let failCount = 0;
    for (const item of imports) {
      try {
        await HostDeviceCode.upsert(item);
        successCount++;
      } catch {
        failCount++;
      }
    }

    sendSuccess(res, req, { total: imports.length, success: successCount, failed: failCount }, `导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
  } catch (err: any) {
    logger.error(`[ControlRoom] hostDeviceCodeImport 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}
