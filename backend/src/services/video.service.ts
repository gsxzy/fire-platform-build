/**
 * ═════════════════════════════════════════════════════════════════
 * GB28181视频监控服务
 * GB/T 28181-2016 公共安全视频监控联网系统信息传输、交换、控制技术要求
 * ═════════════════════════════════════════════════════════════════
 */
import { Device } from '@/models';
import logger from '@/config/logger';

export interface GB28181Device {
  deviceId: string;         // 设备ID
  deviceName: string;       // 设备名称
  ipAddress: string;        // IP地址
  port: number;             // 端口（默认37777）
  username: string;         // 用户名
  password: string;         // 密码
  channel: number;          // 通道号
}

export interface StreamInfo {
  deviceId: string;
  streamUrl: string;        // 播放地址（RTSP/RTMP/HLS）
  streamType: 'rtsp' | 'rtmp' | 'hls' | 'flv';
  resolution: string;         // 分辨率
  bitrate: number;           // 码率
}

export class VideoService {
  private static readonly SIP_PORT = 5060;
  private static readonly DEFAULT_STREAM_PORT = 37777;

  /**
   * 获取设备视频流
   */
  static async getStream(deviceId: number): Promise<StreamInfo | null> {
    try {
      const device = await Device.findByPk(deviceId) as any;
      if (!device) {
        logger.error(`[Video] 设备不存在: ${deviceId}`);
        return null;
      }

      // 解析设备配置
      const config = this.parseDeviceConfig(device);

      // 1. 尝试GB28181 SIP协议获取流
      const sipStream = await this.getGB28181Stream(config);
      if (sipStream) {
        return sipStream;
      }

      // 2. 尝试直接RTSP流
      const rtspStream = await this.getRTSPStream(config);
      if (rtspStream) {
        return rtspStream;
      }

      logger.error(`[Video] 无法获取视频流: ${deviceId}`);
      return null;
    } catch (err: any) {
      logger.error(`[Video] 获取视频流失败: ${err.message}`);
      return null;
    }
  }

  /**
   * GB28181协议获取流
   */
  private static async getGB28181Stream(device: GB28181Device): Promise<StreamInfo | null> {
    try {
      // 这里应该调用SIP协议库（如sip.js）
      // 简化实现，返回模拟流地址

      const sipUrl = `sip:${device.username}@${device.ipAddress}:${this.SIP_PORT}`;
      const streamUrl = `rtsp://${device.ipAddress}:${this.DEFAULT_STREAM_PORT}/live/${device.deviceId}`;

      logger.info(`[Video] GB28181流: ${streamUrl}`);

      return {
        deviceId: device.deviceId,
        streamUrl,
        streamType: 'rtsp',
        resolution: '1080P',
        bitrate: 4000
      };
    } catch (err: any) {
      logger.error(`[Video] GB28181获取流失败: ${err.message}`);
      return null;
    }
  }

  /**
   * RTSP流获取
   */
  private static async getRTSPStream(device: GB28181Device): Promise<StreamInfo | null> {
    try {
      // 标准RTSP地址格式
      const streamUrl = `rtsp://${device.username}:${device.password}@${device.ipAddress}:${device.port}/h264/ch${device.channel}/main/av_stream`;

      logger.info(`[Video] RTSP流: ${streamUrl}`);

      return {
        deviceId: device.deviceId,
        streamUrl,
        streamType: 'rtsp',
        resolution: '1080P',
        bitrate: 4000
      };
    } catch (err: any) {
      logger.error(`[Video] RTSP获取流失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 云台控制
   */
  static async ptzControl(deviceId: number, command: string, params: any = {}): Promise<boolean> {
    try {
      const device = await Device.findByPk(deviceId) as any;
      if (!device) {
        return false;
      }

      const config = this.parseDeviceConfig(device);

      // 发送PTZ控制命令
      const result = await this.sendPTZCommand(config, command, params);

      logger.info(`[Video] PTZ控制: deviceId=${deviceId}, command=${command}, result=${result}`);
      return result;
    } catch (err: any) {
      logger.error(`[Video] PTZ控制失败: ${err.message}`);
      return false;
    }
  }

  /**
   * 发送PTZ命令
   */
  private static async sendPTZCommand(device: GB28181Device, command: string, params: any): Promise<boolean> {
    // PTZ命令类型: up, down, left, right, zoomIn, zoomOut, focusIn, focusOut
    const ptzCommands: Record<string, string> = {
      up: 'PTZ_UP',
      down: 'PTZ_DOWN',
      left: 'PTZ_LEFT',
      right: 'PTZ_RIGHT',
      zoomIn: 'PTZ_ZOOM_IN',
      zoomOut: 'PTZ_ZOOM_OUT',
      focusIn: 'PTZ_FOCUS_IN',
      focusOut: 'PTZ_FOCUS_OUT',
      stop: 'PTZ_STOP'
    };

    const cmdCode = ptzCommands[command] || 'PTZ_STOP';
    const speed = params.speed || 5; // 速度1-10

    // 这里应该通过SIP协议发送PTZ控制命令
    // 简化实现
    logger.info(`[Video] 发送PTZ命令: ${cmdCode}, 速度: ${speed}`);

    return true;
  }

  /**
   * 预设位控制
   */
  static async presetControl(deviceId: number, action: 'goto' | 'set', presetNo: number): Promise<boolean> {
    try {
      const device = await Device.findByPk(deviceId) as any;
      if (!device) {
        return false;
      }

      const config = this.parseDeviceConfig(device);

      if (action === 'goto') {
        // 调用预设位
        logger.info(`[Video] 调用预设位: deviceId=${deviceId}, presetNo=${presetNo}`);
      } else {
        // 设置预设位
        logger.info(`[Video] 设置预设位: deviceId=${deviceId}, presetNo=${presetNo}`);
      }

      return true;
    } catch (err: any) {
      logger.error(`[Video] 预设位控制失败: ${err.message}`);
      return false;
    }
  }

  /**
   * 回放控制
   */
  static async getPlayback(deviceId: number, startTime: string, endTime: string): Promise<string | null> {
    try {
      const device = await Device.findByPk(deviceId) as any;
      if (!device) {
        return null;
      }

      const config = this.parseDeviceConfig(device);

      // 生成回放流地址
      const playbackUrl = `rtsp://${config.username}:${config.password}@${config.ipAddress}:${config.port}/playback?start=${startTime}&end=${endTime}`;

      logger.info(`[Video] 回放流: ${playbackUrl}`);

      return playbackUrl;
    } catch (err: any) {
      logger.error(`[Video] 获取回放流失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 截图
   */
  static async snapshot(deviceId: number): Promise<Buffer | null> {
    try {
      const streamInfo = await this.getStream(deviceId);
      if (!streamInfo) {
        return null;
      }

      // 使用FFmpeg截图
      const { spawn } = require('child_process');
      const outputFile = `/tmp/snapshot_${deviceId}_${Date.now()}.jpg`;

      return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', streamInfo.streamUrl,
          '-frames:v', '1',
          '-y',
          outputFile
        ]);

        ffmpeg.on('close', (code: number | null) => {
          if (code === 0) {
            const fs = require('fs');
            if (fs.existsSync(outputFile)) {
              const buffer = fs.readFileSync(outputFile);
              fs.unlinkSync(outputFile);
              resolve(buffer);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });

        ffmpeg.on('error', () => {
          resolve(null);
        });
      });
    } catch (err: any) {
      logger.error(`[Video] 截图失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 解析设备配置
   */
  private static parseDeviceConfig(device: any): GB28181Device {
    // 从device的protocol_config字段解析配置
    const config = JSON.parse(device.protocol_config || '{}');

    return {
      deviceId: device.id.toString(),
      deviceName: device.device_name,
      ipAddress: config.ip || '127.0.0.1',
      port: config.port || 37777,
      username: config.username || 'admin',
      password: config.password || 'admin',
      channel: config.channel || 1
    };
  }

  /**
   * 设备列表
   */
  static async getVideoDevices(unitId?: number): Promise<any[]> {
    try {
      const where: any = { device_type: '摄像头' };
      if (unitId) {
        where.unit_id = unitId;
      }

      const devices = await Device.findAll({
        where,
        attributes: ['id', 'device_no', 'device_name', 'install_location', 'protocol_config']
      });

      return devices.map((d: any) => ({
        id: d.id,
        deviceNo: d.device_no,
        deviceName: d.device_name,
        location: d.install_location,
        config: JSON.parse(d.protocol_config || '{}')
      }));
    } catch (err: any) {
      logger.error(`[Video] 获取设备列表失败: ${err.message}`);
      return [];
    }
  }
}