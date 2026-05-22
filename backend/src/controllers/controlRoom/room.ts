import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/response';
import { fail } from '@/utils/response';
import { ControlRoom, ControlRoomHost, Device, ControlRoomVideo } from '@/models';
import logger from '@/config/logger';

export async function list(req: Request, res: Response) {
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
}

export async function create(req: Request, res: Response) {
  const t = await sequelize.transaction();
  try {
    const room = await ControlRoom.create(req.body as any, { transaction: t });
    const roomId = (room as any).id;

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
}

export async function update(req: Request, res: Response) {
  try {
    const roomId = req.params.id;
    await ControlRoom.update(req.body, { where: { id: roomId } });

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
}

export async function remove(req: Request, res: Response) {
  try {
    await ControlRoom.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  } catch (err: any) {
    logger.error(`[ControlRoom] delete 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function detail(req: Request, res: Response) {
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
}

export async function videoList(req: Request, res: Response) {
  try {
    const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
    const room = roomId ? await ControlRoom.findByPk(roomId) : null;
    if (!room) return res.json(fail('消控室不存在'));

    const rows = await ControlRoomVideo.findAll({
      where: { room_id: roomId },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });

    const cameraList = rows.map((r: any) => ({
      id: Number(r.id),
      roomId: Number(r.room_id),
      cameraName: r.camera_name || '',
      cameraNo: r.camera_no || '',
      position: r.position || '',
      streamUrl: r.stream_url || '',
      protocol: r.protocol || 'HLS',
      status: r.status === 1 ? 1 : 0,
    }));

    sendSuccess(res, req, cameraList);
  } catch (err: any) {
    logger.error(`[ControlRoom] videoList 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function videoCandidates(req: Request, res: Response) {
  try {
    const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
    const room = roomId ? await ControlRoom.findByPk(roomId) : null;
    if (!room) return res.json(fail('消控室不存在'));

    const unitId = (room as any).unit_id;
    if (!unitId) {
      sendSuccess(res, req, []);
      return;
    }

    // 已关联的摄像头编号
    const linked = await ControlRoomVideo.findAll({
      where: { room_id: roomId },
      attributes: ['camera_no'],
      raw: true,
    }) as any[];
    const linkedNos = new Set(linked.map((l) => l.camera_no).filter(Boolean));

    // 单位下所有摄像头设备，排除已关联的
    const devices = await Device.findAll({
      where: {
        unit_id: unitId,
        device_type: { [Op.in]: ['摄像头', 'gb28181-camera'] },
        ...(linkedNos.size > 0 ? { device_sn: { [Op.notIn]: Array.from(linkedNos) } } : {}),
      },
      attributes: ['id', 'device_name', 'install_location', 'device_sn', 'iot_id', 'protocol_config', 'status'],
      limit: 100,
    });

    const candidates = devices.map((d: any) => {
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
      };
    });

    sendSuccess(res, req, candidates);
  } catch (err: any) {
    logger.error(`[ControlRoom] videoCandidates 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function videoLink(req: Request, res: Response) {
  try {
    const { roomId, cameraNo, cameraName, streamUrl, protocol, position } = req.body || {};
    if (!roomId || !cameraNo) {
      return res.status(400).json(fail('缺少 roomId 或 cameraNo'));
    }

    const room = await ControlRoom.findByPk(roomId);
    if (!room) return res.json(fail('消控室不存在'));

    const [record, created] = await ControlRoomVideo.findOrCreate({
      where: { room_id: roomId, camera_no: cameraNo },
      defaults: {
        room_id: roomId,
        camera_no: cameraNo,
        camera_name: cameraName || cameraNo,
        stream_url: streamUrl || '',
        protocol: protocol || 'HLS',
        position: position || '',
        status: 1,
        sort_order: 0,
      } as any,
    });

    if (!created) {
      await (record as any).update({
        camera_name: cameraName || (record as any).camera_name,
        stream_url: streamUrl || (record as any).stream_url,
        protocol: protocol || (record as any).protocol,
        position: position || (record as any).position,
      });
    }

    sendSuccess(res, req, { id: (record as any).id }, '关联成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] videoLink 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}

export async function videoUnlink(req: Request, res: Response) {
  try {
    const { roomId, cameraNo } = req.body || {};
    if (!roomId || !cameraNo) {
      return res.status(400).json(fail('缺少 roomId 或 cameraNo'));
    }

    const deleted = await ControlRoomVideo.destroy({
      where: { room_id: roomId, camera_no: cameraNo },
    });

    if (deleted === 0) {
      return res.json(fail('未找到关联记录'));
    }

    sendDeleted(res, req, '取消关联成功');
  } catch (err: any) {
    logger.error(`[ControlRoom] videoUnlink 失败: ${err?.message || err}`);
    return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
  }
}
