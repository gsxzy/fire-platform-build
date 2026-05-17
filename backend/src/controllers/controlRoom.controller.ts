import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { sendSuccess, sendPage } from '@/utils/respond';
import { fail } from '@/utils/response';
import { ControlRoom, ControlRoomHost, MultilinePanel, BusPoint, HostDeviceCode, Device } from '@/models';
import { ControlRoomService } from '@/services/controlRoom.service';
import logger from '@/config/logger';

export const ControlRoomController = {
  /* ── 消控室 ── */
  async list(req: Request, res: Response) {
    try {
      const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
      const { keyword } = req.query;
      const where: any = {};
      if (keyword) where[Op.or] = [{ room_name: { [Op.like]: `%${keyword}%` } }, { unit_name: { [Op.like]: `%${keyword}%` } }];

      const { count, rows } = await ControlRoom.findAndCountAll({
        where, limit: pageSize, offset: (pageNum - 1) * pageSize,
        order: [['id', 'DESC']],
      });

      // 批量查询所有主机信息，避免 N+1
      const roomIds = rows.map((r: any) => r.id);
      const hosts = await ControlRoomHost.findAll({
        where: { room_id: { [Op.in]: roomIds } },
        order: [['id', 'ASC']],
        raw: true,
      }) as any[];
      const hostMap = new Map<number, any>();
      for (const h of hosts) {
        if (!hostMap.has(h.room_id)) hostMap.set(h.room_id, h);
      }

      const enriched = rows.map((room: any) => {
        const host = hostMap.get(room.id);
        return {
          ...room.toJSON(),
          host_model: host?.host_model || '',
          host_no: host?.host_no || '',
          host_name: host?.host_name || '',
          device_count: host?.device_count || 0,
          loop_count: host?.loop_count || 0,
        };
      });

      sendPage(res, req, enriched, count, pageNum, pageSize);
    } catch (err: any) {
      logger.error(`[ControlRoom] list 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async create(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const room = await ControlRoom.create(req.body as any, { transaction: t });
      const roomId = (room as any).id;

      // 若请求包含主机信息，同步创建默认报警主机
      if (req.body.host_model || req.body.host_no || req.body.controllerModel || req.body.hostNo) {
        await ControlRoomHost.create({
          room_id: roomId,
          host_name: req.body.host_name || req.body.hostNo || '报警主机1号',
          host_model: req.body.host_model || req.body.controllerModel || '',
          host_no: req.body.host_no || req.body.hostNo || '',
          status: 1,
        } as any, { transaction: t });
      }

      await t.commit();
      sendSuccess(res, req, { id: roomId }, '创建成功');
    } catch (err: any) {
      await t.rollback();
      logger.error(`[ControlRoom] create 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async update(req: Request, res: Response) {
    try {
      const roomId = req.params.id;
      await ControlRoom.update(req.body, { where: { id: roomId } });

      // 同步更新关联的报警主机
      const host = await ControlRoomHost.findOne({ where: { room_id: roomId } });
      if (host) {
        const hostUpdate: any = {};
        if (req.body.host_model !== undefined || req.body.controllerModel !== undefined) {
          hostUpdate.host_model = req.body.host_model || req.body.controllerModel || '';
        }
        if (req.body.host_no !== undefined || req.body.hostNo !== undefined) {
          hostUpdate.host_no = req.body.host_no || req.body.hostNo || '';
        }
        if (req.body.host_name !== undefined || req.body.hostNo !== undefined) {
          hostUpdate.host_name = req.body.host_name || req.body.hostNo || '报警主机1号';
        }
        if (Object.keys(hostUpdate).length > 0) {
          await ControlRoomHost.update(hostUpdate, { where: { id: (host as any).id } });
        }
      } else if (req.body.host_model || req.body.host_no || req.body.controllerModel || req.body.hostNo) {
        // 若之前没有主机，现在请求包含主机信息则创建
        await ControlRoomHost.create({
          room_id: roomId,
          host_name: req.body.host_name || req.body.hostNo || '报警主机1号',
          host_model: req.body.host_model || req.body.controllerModel || '',
          host_no: req.body.host_no || req.body.hostNo || '',
          status: 1,
        } as any);
      }

      sendSuccess(res, req, null, '更新成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] update 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async delete(req: Request, res: Response) {
    try {
      await ControlRoom.destroy({ where: { id: req.params.id } });
      sendSuccess(res, req, null, '删除成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] delete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async detail(req: Request, res: Response) {
    try {
      const room = await ControlRoom.findByPk(req.params.id);
      if (!room) return res.json(fail('消控室不存在'));
      const [hosts, devices] = await Promise.all([
        ControlRoomHost.findAll({ where: { room_id: (room as any).id } }),
        Device.findAll({ where: { unit_id: (room as any).unit_id }, limit: 20 }),
      ]);
      sendSuccess(res, req, { room, hosts, devices });
    } catch (err: any) {
      logger.error(`[ControlRoom] detail 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 关联摄像头 ── */
  async videoList(req: Request, res: Response) {
    try {
      const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
      const room = roomId ? await ControlRoom.findByPk(roomId) : null;
      if (!room) return res.json(fail('消控室不存在'));
      const devices = await Device.findAll({
        where: { unit_id: (room as any).unit_id, device_type: '摄像头' },
        attributes: ['id', 'device_name', 'install_location', 'device_sn', 'iot_id', 'protocol_config', 'status'],
        limit: 20,
      });
      const cameras = devices.map((d: any) => {
        let cfg: Record<string, any> = {};
        try { cfg = d.protocol_config ? JSON.parse(d.protocol_config) : {}; } catch { /* ignore */ }
        const deviceId = d.device_sn || d.iot_id || String(d.id);
        return {
          id: Number(d.id),
          cameraName: d.device_name,
          cameraNo: deviceId,
          position: d.install_location || '',
          deviceId,
          channelId: cfg.channelId || deviceId,
          status: d.status === 1 ? 1 : 0,
          streamUrl: '',
        };
      });
      sendSuccess(res, req, cameras);
    } catch (err: any) {
      logger.error(`[ControlRoom] videoList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 报警主机 ── */
  async hostList(req: Request, res: Response) {
    try {
      const { roomId } = req.query;
      const where: any = {};
      if (roomId) where.room_id = roomId;
      const hosts = await ControlRoomHost.findAll({ where, order: [['id', 'ASC']] });
      sendSuccess(res, req, hosts);
    } catch (err: any) {
      logger.error(`[ControlRoom] hostList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostCreate(req: Request, res: Response) {
    try {
      const host = await ControlRoomHost.create(req.body as any);
      sendSuccess(res, req, { id: (host as any).id }, '主机添加成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostUpdate(req: Request, res: Response) {
    try {
      await ControlRoomHost.update(req.body, { where: { id: req.params.id } });
      sendSuccess(res, req, null, '更新成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostDelete(req: Request, res: Response) {
    try {
      await ControlRoomHost.destroy({ where: { id: req.params.id } });
      sendSuccess(res, req, null, '删除成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostDetail(req: Request, res: Response) {
    try {
      const data = await ControlRoomService.getHostDetail(+req.params.id);
      if (!data) return res.json(fail('主机不存在'));
      sendSuccess(res, req, data);
    } catch (err: any) {
      logger.error(`[ControlRoom] hostDetail 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 消音（通过报警主机） ── */
  async silence(req: Request, res: Response) {
    try {
      const { hostId } = req.body;
      const result = await ControlRoomService.silenceHost(+hostId, req.user!.userId, req.user!.username);
      sendSuccess(res, req, result, result.msg);
    } catch (err: any) {
      logger.error(`[ControlRoom] silence 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 复位（通过报警主机） ── */
  async reset(req: Request, res: Response) {
    try {
      const { hostId } = req.body;
      const result = await ControlRoomService.resetHost(+hostId, req.user!.userId, req.user!.username);
      sendSuccess(res, req, result, result.msg);
    } catch (err: any) {
      logger.error(`[ControlRoom] reset 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 手自动切换（通过报警主机） ── */
  async switchMode(req: Request, res: Response) {
    try {
      const { hostId, mode } = req.body;
      const result = await ControlRoomService.switchMode(+hostId, mode, req.user!.userId, req.user!.username);
      sendSuccess(res, req, result, result.msg);
    } catch (err: any) {
      logger.error(`[ControlRoom] switchMode 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 多线盘控制（通过报警主机） ── */
  async controlMultiline(req: Request, res: Response) {
    try {
      const { hostId, pointId, action } = req.body;
      const result = await ControlRoomService.controlMultiline(+hostId, +pointId, action, req.user!.userId, req.user!.username);
      sendSuccess(res, req, result, result.msg);
    } catch (err: any) {
      logger.error(`[ControlRoom] controlMultiline 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 多线盘点位 ── */
  async multilineList(req: Request, res: Response) {
    try {
      const { hostId } = req.query;
      const where: any = {};
      if (hostId) where.host_id = hostId;
      const list = await MultilinePanel.findAll({ where, order: [['point_no', 'ASC']] });
      sendSuccess(res, req, list);
    } catch (err: any) {
      logger.error(`[ControlRoom] multilineList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async multilineCreate(req: Request, res: Response) {
    try {
      const p = await MultilinePanel.create(req.body as any);
      sendSuccess(res, req, { id: (p as any).id }, '创建成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] multilineCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async multilineUpdate(req: Request, res: Response) {
    try {
      await MultilinePanel.update(req.body, { where: { id: req.params.id } });
      sendSuccess(res, req, null, '更新成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] multilineUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 总线点位 ── */
  async busPointList(req: Request, res: Response) {
    try {
      const { hostId, loopNo, status } = req.query;
      const where: any = {};
      if (hostId) where.host_id = hostId;
      if (loopNo) where.loop_no = loopNo;
      if (status !== undefined) where.status = status;
      const list = await BusPoint.findAll({ where, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] });
      sendSuccess(res, req, list);
    } catch (err: any) {
      logger.error(`[ControlRoom] busPointList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async busPointCreate(req: Request, res: Response) {
    try {
      const p = await BusPoint.create(req.body as any);
      sendSuccess(res, req, { id: (p as any).id }, '创建成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] busPointCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async busPointUpdate(req: Request, res: Response) {
    try {
      await BusPoint.update(req.body, { where: { id: req.params.id } });
      sendSuccess(res, req, null, '更新成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] busPointUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 控制日志 ── */
  async commandLogs(req: Request, res: Response) {
    try {
      const { hostId, pageNum = 1, pageSize = 20 } = req.query;
      const data = await ControlRoomService.getCommandLogs(
        hostId ? +hostId : undefined, +pageNum, +pageSize
      );
      sendPage(res, req, data.list, data.total, data.pageNum, data.pageSize);
    } catch (err: any) {
      logger.error(`[ControlRoom] commandLogs 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 报警主机编码表 ── */
  async hostDeviceCodeList(req: Request, res: Response) {
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
      // 如果传了 roomId，先查该 room 下的所有 hostId，再 IN 查询
      if (roomId && !hostId) {
        const hosts = await ControlRoomHost.findAll({
          where: { room_id: roomId },
          attributes: ['id'],
          raw: true,
        });
        const hostIds = hosts.map((h: any) => h.id);
        if (hostIds.length) where.host_id = { [Op.in]: hostIds };
        else where.host_id = -1; // 无数据
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
  },
  async hostDeviceCodeCreate(req: Request, res: Response) {
    try {
      const item = await HostDeviceCode.create(req.body as any);
      sendSuccess(res, req, { id: (item as any).id }, '创建成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostDeviceCodeCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostDeviceCodeUpdate(req: Request, res: Response) {
    try {
      await HostDeviceCode.update(req.body, { where: { id: req.params.id } });
      sendSuccess(res, req, null, '更新成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostDeviceCodeUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostDeviceCodeDelete(req: Request, res: Response) {
    try {
      await HostDeviceCode.destroy({ where: { id: req.params.id } });
      sendSuccess(res, req, null, '删除成功');
    } catch (err: any) {
      logger.error(`[ControlRoom] hostDeviceCodeDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async hostDeviceCodeImport(req: Request, res: Response) {
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

      // 智能识别表头行（前5行内匹配）
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
  },
};
