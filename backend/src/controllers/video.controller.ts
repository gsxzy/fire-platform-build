import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/respond';
import { fail } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { VideoService } from '@/services/video.service';
import logger from '@/config/logger';

function log(tag: string, msg: string) {
  logger.info(`[VideoRoute][${tag}] ${msg}`);
}

export const VideoController = {
  /* ══════════════════════════════════════════════════════════════
     1. 设备列表
     ══════════════════════════════════════════════════════════════ */
  async list(req: Request, res: Response) {
    try {
      const params = {
        page: Number(req.query.page) || 1,
        count: Number(req.query.count) || 100,
        query: req.query.query as string | undefined,
        online: req.query.online !== undefined ? req.query.online === 'true' : undefined,
      };
      const data = await VideoService.getVideoDevices(params);
      sendSuccess(res, req, data, '获取设备列表成功');
    } catch (err: any) {
      log('ERROR', `获取设备列表失败: ${err.message}`);
      return res.json(fail(`获取设备列表失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     2. 通道列表
     ══════════════════════════════════════════════════════════════ */
  async channels(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const params = {
        page: Number(req.query.page) || 1,
        count: Number(req.query.count) || 100,
      };
      const data = await VideoService.getDeviceChannels(deviceId, params);
      sendSuccess(res, req, data, '获取通道列表成功');
    } catch (err: any) {
      log('ERROR', `获取通道列表失败: ${err.message}`);
      return res.json(fail(`获取通道列表失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     3. 流列表（ZLM）
     ══════════════════════════════════════════════════════════════ */
  async streams(req: Request, res: Response) {
    try {
      const data = await VideoService.getAllZLMStreamStatus();
      sendSuccess(res, req, data, '获取流列表成功');
    } catch (err: any) {
      log('ERROR', `获取流列表失败: ${err.message}`);
      return res.json(fail(`获取流列表失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     4. 指定摄像头流状态（ZLM）
     ══════════════════════════════════════════════════════════════ */
  async streamStatus(req: Request, res: Response) {
    try {
      const { cameraId } = req.params;
      const data = await VideoService.getZLMStreamStatus(cameraId);
      if (!data) {
        throw new HttpError(`摄像头不存在: ${cameraId}`, 404);
      }
      sendSuccess(res, req, data, '获取流状态成功');
    } catch (err: any) {
      log('ERROR', `获取流状态失败: ${err.message}`);
      return res.json(fail(`获取流状态失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     5. 开始推流（ZLM）
     ══════════════════════════════════════════════════════════════ */
  async startStream(req: Request, res: Response) {
    try {
      const { cameraId } = req.params;
      const started = await VideoService.startZLMStream(cameraId);
      if (!started) {
        throw new HttpError(`启动推流失败: ${cameraId}`, 400);
      }
      // 立即返回启动状态，客户端轮询获取流状态（避免setTimeout导致响应关闭后写res崩溃）
      sendSuccess(res, req, { cameraId, started: true, message: '推流启动中，请稍后查询流状态' }, '推流已启动');
    } catch (err: any) {
      log('ERROR', `启动推流失败: ${err.message}`);
      throw new HttpError(`启动推流失败: ${err.message}`, 500);
    }
  },

  /* ══════════════════════════════════════════════════════════════
     6. 停止推流（ZLM）
     ══════════════════════════════════════════════════════════════ */
  async stopZLMStream(req: Request, res: Response) {
    try {
      const { cameraId } = req.params;
      const stopped = await VideoService.stopZLMStream(cameraId);
      sendSuccess(res, req, { stopped }, '推流已停止');
    } catch (err: any) {
      log('ERROR', `停止推流失败: ${err.message}`);
      return res.json(fail(`停止推流失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     7. 获取播放地址（核心兼容接口）
     body: { deviceId, channelId, cameraId }
     ══════════════════════════════════════════════════════════════ */
  async getPlayUrl(req: Request, res: Response) {
    try {
      const { cameraId, deviceId, channelId } = req.body;
      const dev = (deviceId || cameraId || '').trim();
      const ch = (channelId || deviceId || dev || '').trim();
      if (!dev) {
        throw new HttpError('deviceId 不能为空', 400);
      }

      const payload = await VideoService.getUnifiedStream(dev, ch);
      if (!payload || !payload.streamUrl) {
        throw new HttpError(`取流失败或播放地址为空（deviceId=${dev} channelId=${ch}），请检查设备注册与通道 ID`, 502);
      }
      sendSuccess(res, req, payload, '获取播放地址成功');
    } catch (err: any) {
      log('ERROR', `获取播放地址失败: ${err.message}`);
      return res.json(fail(`获取播放地址失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     8. 摄像头配置列表（ZLM）
     ══════════════════════════════════════════════════════════════ */
  async cameraConfigs(req: Request, res: Response) {
    try {
      const data = VideoService.getCameraConfigs();
      sendSuccess(res, req, data, '获取摄像头配置成功');
    } catch (err: any) {
      log('ERROR', `获取摄像头配置失败: ${err.message}`);
      return res.json(fail(`获取摄像头配置失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     9. 停止播放
     ══════════════════════════════════════════════════════════════ */
  async stopPlay(req: Request, res: Response) {
    try {
      const { deviceId, channelId } = req.body;
      if (!deviceId) {
        throw new HttpError('deviceId 不能为空', 400);
      }
      await VideoService.stopStream(deviceId, channelId);
      sendSuccess(res, req, null, '播放已停止');
    } catch (err: any) {
      log('ERROR', `停止播放失败: ${err.message}`);
      return res.json(fail(`停止播放失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     10. PTZ 云台控制
     ══════════════════════════════════════════════════════════════ */
  async ptzControl(req: Request, res: Response) {
    try {
      const { deviceId, channelId, cmd, horizonSpeed, verticalSpeed, zoomSpeed } = req.body;
      const devId = deviceId || req.params.deviceId;
      if (!devId || cmd === undefined) {
        throw new HttpError('deviceId 和 cmd 不能为空', 400);
      }
      await VideoService.ptzControl(devId, channelId || devId, cmd, { horizonSpeed, verticalSpeed, zoomSpeed });
      sendSuccess(res, req, null, '云台控制已发送');
    } catch (err: any) {
      log('ERROR', `云台控制失败: ${err.message}`);
      return res.json(fail(`云台控制失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     11. 预设位控制
     ══════════════════════════════════════════════════════════════ */
  async presetControl(req: Request, res: Response) {
    try {
      const { deviceId, channelId, action, presetNo } = req.body;
      const devId = deviceId || req.params.deviceId;
      if (!devId || !action || presetNo === undefined) {
        throw new HttpError('deviceId、action 和 presetNo 不能为空', 400);
      }
      await VideoService.presetControl(devId, channelId || devId, action, Number(presetNo));
      sendSuccess(res, req, null, `预设位${action}已发送`);
    } catch (err: any) {
      log('ERROR', `预设位控制失败: ${err.message}`);
      return res.json(fail(`预设位控制失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     12. 录像回放
     ══════════════════════════════════════════════════════════════ */
  async getPlayback(req: Request, res: Response) {
    try {
      const { deviceId, channelId, startTime, endTime } = req.body;
      const devId = deviceId || req.params.deviceId;
      if (!devId || !startTime || !endTime) {
        throw new HttpError('deviceId、startTime 和 endTime 不能为空', 400);
      }
      const payload = await VideoService.getPlayback(devId, channelId || devId, startTime, endTime);
      if (!payload) {
        return res.json(fail('当前模式不支持录像回放'));
      }
      sendSuccess(res, req, payload, '获取回放地址成功');
    } catch (err: any) {
      log('ERROR', `获取回放地址失败: ${err.message}`);
      return res.json(fail(`获取回放地址失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     13. 截图
     ══════════════════════════════════════════════════════════════ */
  async snapshot(req: Request, res: Response) {
    try {
      const { deviceId, channelId } = req.params;
      const devId = deviceId || req.params.deviceId;
      const chId = channelId || devId;
      const result = await VideoService.snapshot(devId, chId);
      if (!result) {
        return res.json(fail('截图失败'));
      }
      if (result.buffer) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(result.buffer);
      }
      sendSuccess(res, req, { snapUrl: result.snapUrl }, '截图成功');
    } catch (err: any) {
      log('ERROR', `截图失败: ${err.message}`);
      return res.json(fail(`截图失败: ${err.message}`));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     14. 实时预览（新版接口）
     ══════════════════════════════════════════════════════════════ */
  async livePreview(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const payload = await VideoService.getUnifiedStream(deviceId);
      if (!payload) {
        return res.json(fail('无法获取视频流'));
      }
      sendSuccess(res, req, {
        hls: payload.hls,
        rtmp: payload.rtmp,
        rtsp: payload.streamUrl,
        flv: payload.flv,
        wsFlv: payload.wsFlv,
      });
    } catch (err: any) {
      log('ERROR', `实时预览失败: ${err.message}`);
      return res.json(fail(err.message));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     15. 获取视频流（旧版单设备接口，保留兼容）
     ══════════════════════════════════════════════════════════════ */
  async getStream(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const payload = await VideoService.getUnifiedStream(deviceId);
      if (!payload) {
        return res.json(fail('无法获取视频流'));
      }
      sendSuccess(res, req, payload);
    } catch (err: any) {
      log('ERROR', `获取视频流失败: ${err.message}`);
      return res.json(fail(err.message));
    }
  },
};
