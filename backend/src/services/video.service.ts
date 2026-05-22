/**
 * ═════════════════════════════════════════════════════════════════
 * 视频监控服务（统一入口）
 * 兼容 ZLMediaKit 直连 与 WVP-PRO GB28181 两种模式
 * ═════════════════════════════════════════════════════════════════
 */
import { spawn } from 'child_process';
import fs from 'fs';
import { Device } from '@/models';
import logger from '@/config/logger';
import { ZLMService, StreamStatus as ZLMStreamStatus } from './zlm.service';
import * as WVP from './wvp.service';

const WVP_ENABLED = !!(process.env.WVP_PRO_URL && String(process.env.WVP_PRO_URL).trim());
if (!process.env.ZLM_PLAY_HOST) {
  throw new Error('[Video] 错误：未设置 ZLM_PLAY_HOST 环境变量');
}
const ZLM_PLAY_HOST = process.env.ZLM_PLAY_HOST;
const ZLM_PUBLIC_URL = process.env.ZLM_PUBLIC_URL;

/* ═════ 设备ID → ZLM摄像头ID 映射（集中定义，消除重复）═════ */
const CAMERA_ID_MAP: Record<string, string> = {
  '34020000001300000001': 'CAM-001',
  '34020000001320000002': 'CAM-002',
  '34020000001300000002': 'CAM-002',
  'CAM_001': 'CAM-001',
  'CAM-001': 'CAM-001',
  'CAM-002': 'CAM-002',
  '1': 'CAM-001',
  '2': 'CAM-002',
};

function replaceLocalhost(url: string): string {
  if (!url) return url;
  return url
    .replace(/127\.0\.0\.1:8081/g, `${ZLM_PLAY_HOST}:8081`)
    .replace(/127\.0\.0\.1:443/g, `${ZLM_PLAY_HOST}:443`)
    .replace(/127\.0\.0\.1:10001/g, `${ZLM_PLAY_HOST}:10001`);
}

function normalizeZlmUrl(url: string): string {
  if (!url || !ZLM_PUBLIC_URL) return url;
  const base = ZLM_PUBLIC_URL.replace(/\/$/, '');
  return url.replace(/^https?:\/\/[^/]+(?::\d+)?\//, `${base}/`);
}

export interface UnifiedStreamInfo {
  deviceId: string;
  channelId: string;
  flv: string;
  hls: string;
  rtmp: string;
  rtsps: string;
  rtc: string;
  wsFlv: string;
  httpsFlv: string;
  httpsHls: string;
  streamId: string;
  mediaServerId: string;
  startTime: string;
  ssrc: string;
  streamUrl: string;
  snapUrl: string;
}

export class VideoService {
  /* ══════════════════════════════════════════════════════════════
     ZLMediaKit 直连模式
     ══════════════════════════════════════════════════════════════ */

  static async getZLMStreamStatus(cameraId: string): Promise<ZLMStreamStatus | null> {
    return ZLMService.getStreamStatus(cameraId);
  }

  static async getAllZLMStreamStatus(): Promise<ZLMStreamStatus[]> {
    return ZLMService.getAllStreamStatus();
  }

  static async startZLMStream(cameraId: string): Promise<boolean> {
    return ZLMService.startStream(cameraId);
  }

  static async stopZLMStream(cameraId: string): Promise<boolean> {
    return ZLMService.stopStream(cameraId);
  }

  static async startAllZLM(): Promise<void> {
    return ZLMService.startAll();
  }

  /* ══════════════════════════════════════════════════════════════
     WVP-PRO GB28181 模式
     ══════════════════════════════════════════════════════════════ */

  static async getWVPDevices(params?: { page?: number; count?: number; query?: string; online?: boolean }): Promise<{ total: number; list: any[] }> {
    return WVP.getVideoDevices(params);
  }

  static async getWVPChannels(deviceId: string, params?: { page?: number; count?: number; query?: string; online?: boolean }): Promise<{ total: number; list: any[] }> {
    return WVP.getDeviceChannels(deviceId, params);
  }

  static async startWVPStream(deviceId: string, channelId: string): Promise<UnifiedStreamInfo> {
    const s = await WVP.getStream(deviceId, channelId);
    return this.wvpPlayToPayload(s, deviceId, channelId);
  }

  static async stopWVPStream(deviceId: string, channelId: string): Promise<any> {
    return WVP.stopStream(deviceId, channelId);
  }

  static async wvpPTZControl(deviceId: string, channelId: string, cmd: number, horizonSpeed?: number, verticalSpeed?: number, zoomSpeed?: number): Promise<any> {
    return WVP.ptzControl(deviceId, channelId, cmd, horizonSpeed, verticalSpeed, zoomSpeed);
  }

  static async wvpPresetControl(deviceId: string, channelId: string, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<any> {
    return WVP.presetControl(deviceId, channelId, action, presetNo);
  }

  static async wvpPlayback(deviceId: string, channelId: string, startTime: string, endTime: string): Promise<any> {
    return WVP.getPlayback(deviceId, channelId, startTime, endTime);
  }

  static async wvpSnapshot(deviceId: string, channelId: string): Promise<string> {
    return WVP.snapshot(deviceId, channelId);
  }

  static async wvpDeviceStatus(deviceId: string): Promise<any> {
    return WVP.getDeviceStatus(deviceId);
  }

  /* ══════════════════════════════════════════════════════════════
     统一兼容接口（供 Controller 调用）
     ══════════════════════════════════════════════════════════════ */

  /**
   * 获取视频设备列表（自动判断 WVP/ZLM）
   */
  static async getVideoDevices(params?: { page?: number; count?: number; query?: string; online?: boolean }): Promise<{ total: number; list: any[] }> {
    if (WVP_ENABLED) {
      try {
        const raw = await this.getWVPDevices(params);
        const list = (raw.list || []).map((d: any) => ({
          deviceId: d.deviceId,
          name: d.name || d.deviceId,
          ip: d.ip || '',
          port: d.port || 5060,
          onLine: d.onLine !== false,
          channelCount: d.channelCount || 0,
          manufacturer: d.manufacturer || '',
          model: d.model || '',
          status: d.onLine !== false ? 'online' : 'offline',
        }));
        return { total: raw.total ?? list.length, list };
      } catch (err: any) {
        logger.warn(`[Video] WVP 获取设备列表失败，fallback 到 ZLM/DB 模式: ${err.message}`);
      }
    }

    // ZLM 模式：硬编码摄像头 + 数据库摄像头
    const zlmList = ZLMService.getCameraIds().map((id) => {
      const cfg = ZLMService.getCameraConfig(id);
      return {
        deviceId: id,
        name: cfg?.name || id,
        ip: cfg?.ip || '',
        port: 554,
        onLine: true,
        channelCount: 1,
        manufacturer: 'Hikvision',
        model: 'IP Camera',
        status: 'online',
      };
    });

    const dbDevices = await this.getDBVideoDevices();
    const list = [...zlmList, ...dbDevices];
    return { total: list.length, list };
  }

  /**
   * 获取设备通道列表
   */
  static async getDeviceChannels(deviceId: string, params?: { page?: number; count?: number }): Promise<{ total: number; list: any[] }> {
    if (WVP_ENABLED) {
      try {
        const raw = await this.getWVPChannels(deviceId, params);
        const list = (raw.list || []).map((ch: any) => ({
          channelId: ch.channelId || ch.deviceId || String(ch.id),
          name: ch.name || ch.channelId || '',
          deviceId: ch.deviceId || deviceId,
          status: ch.status,
          hasAudio: !!ch.hasAudio,
        }));
        return { total: raw.total ?? list.length, list };
      } catch (err: any) {
        logger.warn(`[Video] WVP 获取通道列表失败，fallback 到 ZLM 模式: ${err.message}`);
      }
    }

    // ZLM 单通道
    const cfg = ZLMService.getCameraConfig(deviceId);
    if (!cfg) return { total: 0, list: [] };
    return {
      total: 1,
      list: [{
        channelId: '1',
        name: `${cfg.name}-通道1`,
        deviceId,
        status: 'ON',
        hasAudio: false,
      }],
    };
  }

  /**
   * 统一取流（POST /stream 核心接口）
   */
  static async getUnifiedStream(deviceId: string, channelId?: string): Promise<UnifiedStreamInfo | null> {
    const ch = channelId || deviceId;

    if (WVP_ENABLED) {
      try {
        const s = await WVP.getStream(deviceId, ch);
        return this.wvpPlayToPayload(s, deviceId, ch);
      } catch (err: any) {
        logger.error(`[Video] WVP 取流失败 device=${deviceId}: ${err.message}，尝试 ZLM fallback...`);
        // WVP 失败时 fallback 到 ZLM 模式
      }
    }

    // ZLM 模式：映射 deviceId → cameraId
    const mappedId = CAMERA_ID_MAP[deviceId] || deviceId;

    // 确保推流已启动
    let status = await ZLMService.getStreamStatus(mappedId);
    if (status && !status.isAlive) {
      await ZLMService.startStream(mappedId);
      await new Promise(r => setTimeout(r, 8000));
      status = await ZLMService.getStreamStatus(mappedId);
    }

    if (!status) {
      logger.error(`[Video] 摄像头不存在: ${mappedId}`);
      return null;
    }

    return {
      deviceId: mappedId,
      channelId: '1',
      flv: status.flv || '',
      hls: status.hls || '',
      rtmp: status.rtmp || '',
      rtsps: '',
      rtc: '',
      wsFlv: status.flv || '',
      httpsFlv: status.flv || '',
      httpsHls: status.hls || '',
      streamId: mappedId,
      mediaServerId: 'zlm',
      startTime: new Date().toISOString(),
      ssrc: '',
      streamUrl: status.hls || status.flv || '',
      snapUrl: '',
    };
  }

  /**
   * 停止播放
   */
  static async stopStream(deviceId: string, channelId?: string): Promise<boolean> {
    if (WVP_ENABLED) {
      await WVP.stopStream(deviceId, channelId || deviceId);
      return true;
    }
    const mappedId = CAMERA_ID_MAP[deviceId] || deviceId;
    return ZLMService.stopStream(mappedId);
  }

  /**
   * PTZ 云台控制
   */
  static async ptzControl(deviceId: string, channelId: string | undefined, cmd: number | string, params: any = {}): Promise<boolean> {
    if (WVP_ENABLED) {
      let ptzCmd = Number(cmd);
      if (typeof cmd === 'string') {
        const cmdMap: Record<string, number> = { up: 0, down: 1, left: 2, right: 3, zoomIn: 4, zoomOut: 5, stop: 0 };
        ptzCmd = cmdMap[cmd] !== undefined ? cmdMap[cmd] : Number(cmd);
      }
      await WVP.ptzControl(deviceId, channelId || deviceId, ptzCmd, params.horizonSpeed || 50, params.verticalSpeed || 50, params.zoomSpeed || 50);
      return true;
    }
    logger.warn('[Video] 当前模式不支持云台控制');
    return false;
  }

  /**
   * 预设位控制
   */
  static async presetControl(deviceId: string, channelId: string | undefined, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<boolean> {
    if (WVP_ENABLED) {
      await WVP.presetControl(deviceId, channelId || deviceId, action, presetNo);
      return true;
    }
    logger.warn('[Video] 当前模式不支持预设位控制');
    return false;
  }

  /**
   * 录像回放
   */
  static async getPlayback(deviceId: string, channelId: string | undefined, startTime: string, endTime: string): Promise<any> {
    if (WVP_ENABLED) {
      const s = await WVP.getPlayback(deviceId, channelId || deviceId, startTime, endTime);
      return {
        deviceId,
        channelId: channelId || deviceId,
        flv: s.flv || '',
        hls: s.hls || '',
        rtmp: s.rtmp || '',
        wsFlv: s.wsFlv || '',
        streamId: s.streamId || '',
        startTime: s.startTime || startTime,
        endTime: s.endTime || endTime,
        duration: s.duration || 0,
        streamUrl: s.hls || s.flv || '',
      };
    }
    logger.warn('[Video] 当前模式不支持录像回放');
    return null;
  }

  /**
   * 截图
   */
  static async snapshot(deviceId: string, channelId?: string): Promise<{ snapUrl?: string; buffer?: Buffer } | null> {
    if (WVP_ENABLED) {
      const snapUrl = await WVP.snapshot(deviceId, channelId || deviceId);
      return { snapUrl };
    }

    // ZLM / RTSP 截图：用 FFmpeg
    try {
      const mappedId = CAMERA_ID_MAP[deviceId] || deviceId;
      const status = await ZLMService.getStreamStatus(mappedId);
      const streamUrl = status?.flv || status?.hls;
      if (!streamUrl) return null;

      const tmpDir = process.platform === 'win32' ? (process.env.TEMP || 'C:\\temp') : '/tmp';
      const outputFile = `${tmpDir}/snapshot_${mappedId}_${Date.now()}.jpg`;

      return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', streamUrl,
          '-frames:v', '1',
          '-y',
          outputFile
        ]);

        // 15 秒超时保护，防止 ffmpeg 进程卡死成为僵尸进程
        const killTimer = setTimeout(() => {
          try { ffmpeg.kill('SIGKILL'); } catch { /* ignore */ }
          resolve(null);
        }, 15000);

        ffmpeg.on('close', (code: number | null) => {
          clearTimeout(killTimer);
          if (code === 0) {
            if (fs.existsSync(outputFile)) {
              const buffer = fs.readFileSync(outputFile);
              fs.unlinkSync(outputFile);
              resolve({ buffer });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });

        ffmpeg.on('error', () => {
          clearTimeout(killTimer);
          resolve(null);
        });
      });
    } catch (err: any) {
      logger.error(`[Video] 截图失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 获取摄像头配置列表（ZLM）
   */
  static getCameraConfigs(): any[] {
    return ZLMService.getCameraIds().map((id) => {
      const cfg = ZLMService.getCameraConfig(id);
      return {
        id,
        name: cfg?.name || id,
        ip: cfg?.ip || '',
        streamKey: cfg?.streamKey || id,
      };
    });
  }

  /* ══════════════════════════════════════════════════════════════
     内部工具
     ══════════════════════════════════════════════════════════════ */

  private static wvpPlayToPayload(s: WVP.WVPStreamInfo, deviceId: string, channelId: string): UnifiedStreamInfo {
    const rawFlv = normalizeZlmUrl(replaceLocalhost((s.flv || s.wsFlv || '').trim()));
    const rawHls = normalizeZlmUrl(replaceLocalhost((s.httpsHls || s.hls || s.wsHls || '').trim()));
    let hls = rawHls;
    if (!hls && rawFlv) {
      hls = rawFlv.replace(/\.live\.flv(?:\?.*)?$/, '/hls.m3u8');
    }
    const flv = rawFlv;
    const streamUrl = hls || flv;
    return {
      deviceId,
      channelId,
      flv,
      hls,
      rtmp: normalizeZlmUrl(replaceLocalhost((s.rtmp || '').trim())),
      rtsps: normalizeZlmUrl(replaceLocalhost((s.rtsps || '').trim())),
      rtc: normalizeZlmUrl(replaceLocalhost((s.rtc || '').trim())),
      wsFlv: normalizeZlmUrl(replaceLocalhost((s.wsFlv || '').trim())),
      httpsFlv: normalizeZlmUrl(replaceLocalhost((s.httpsFlv || '').trim())),
      httpsHls: normalizeZlmUrl(replaceLocalhost((s.httpsHls || '').trim())),
      streamId: (s.streamId || '').trim(),
      mediaServerId: (s.mediaServerId || '').trim(),
      startTime: s.startTime || new Date().toISOString(),
      ssrc: (s.ssrc || '').trim(),
      streamUrl,
      snapUrl: '',
    };
  }

  private static async getDBVideoDevices(): Promise<any[]> {
    try {
      const devices = await Device.findAll({
        where: { device_type: '摄像头' },
        attributes: ['id', 'device_no', 'device_name', 'install_location', 'protocol_config', 'protocol_type', 'iot_id', 'device_sn'],
      });
      return devices.map((d: any) => {
        const cfg = this.safeParseConfig(d.protocol_config);
        return {
          id: d.id,
          deviceId: d.device_sn || d.iot_id || String(d.id),
          name: d.device_name,
          ip: cfg.ip || '',
          port: cfg.port || 554,
          onLine: true,
          channelCount: 1,
          manufacturer: cfg.manufacturer || '',
          model: cfg.model || '',
          status: 'online',
        };
      });
    } catch (err: any) {
      logger.error(`[Video] 获取数据库摄像头失败: ${err.message}`);
      return [];
    }
  }

  private static safeParseConfig(raw: string | null | undefined): Record<string, any> {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}
