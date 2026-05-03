import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import { VideoService } from '@/services/video.service';

export const VideoController = {
  /**
   * 获取视频设备列表
   */
  async list(req: Request, res: Response) {
    try {
      const { unitId } = req.query;
      const devices = await VideoService.getVideoDevices(unitId ? +unitId : undefined);

      return res.json(success(devices));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 获取视频流
   */
  async getStream(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const stream = await VideoService.getStream(+deviceId);

      if (!stream) {
        return res.json(fail('无法获取视频流'));
      }

      return res.json(success(stream));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * PTZ控制
   */
  async ptzControl(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { command, ...params } = req.body;

      const result = await VideoService.ptzControl(+deviceId, command, params);

      return res.json(success({ result }, result ? 'PTZ控制成功' : 'PTZ控制失败'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 预设位控制
   */
  async presetControl(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { action, presetNo } = req.body;

      const result = await VideoService.presetControl(+deviceId, action, presetNo);

      return res.json(success({ result }, result ? '预设位控制成功' : '预设位控制失败'));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 获取回放流
   */
  async getPlayback(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { startTime, endTime } = req.query;

      const playbackUrl = await VideoService.getPlayback(
        +deviceId,
        startTime as string,
        endTime as string
      );

      if (!playbackUrl) {
        return res.json(fail('无法获取回放流'));
      }

      return res.json(success({ playbackUrl }));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 截图
   */
  async snapshot(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const buffer = await VideoService.snapshot(+deviceId);

      if (!buffer) {
        return res.json(fail('截图失败'));
      }

      // 返回图片
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(buffer);
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },

  /**
   * 实时预览（返回HLS播放地址）
   */
  async livePreview(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const stream = await VideoService.getStream(+deviceId);

      if (!stream) {
        return res.json(fail('无法获取视频流'));
      }

      // 返回HLS或RTMP流地址
      const liveUrl = {
        hls: `http://localhost:3000/live/${deviceId}.m3u8`,
        rtmp: `rtmp://localhost:1935/live/${deviceId}`,
        rtsp: stream.streamUrl
      };

      return res.json(success(liveUrl));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  }
};