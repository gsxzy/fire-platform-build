/**
 * ═══════════════════════════════════════════════════════════════════
 * GB26875协议TCP服务器 - 真实设备验证版
 * 
 * 功能：
 * - 监听赋安FSCN8001等用户传输装置的TCP连接
 * - 自动帧同步和解析
 * - 设备连接自动注册，断开自动注销
 * - 精准发送控制指令到指定设备（不再广播！）
 * 
 * 历史：移植自V1.0 Python版本，经过真实FSCN8001设备联调验证
 * ═══════════════════════════════════════════════════════════════════
 */
import net, { Socket } from 'net';
import { gb26875Protocol, type ProtocolEvent } from './gb26875.service';
import logger from '@/config/logger';
import { EventEmitter } from 'events';

interface DeviceConnection {
  socket: Socket;
  clientIp: string;
  userCode?: string;
  connectedAt: Date;
  lastActive: Date;
}

export class GB26875Server extends EventEmitter {
  private server: net.Server | null = null;
  private port: number;
  private host: string;
  private running: boolean = false;
  
  // 设备连接映射表：精准控制，禁止广播
  private connections: Map<string, DeviceConnection> = new Map(); // key: clientIp:port
  private userCodeToConnection: Map<string, DeviceConnection> = new Map(); // userCode -> connection

  constructor(port: number = 5200, host: string = '0.0.0.0') {
    super();
    this.port = port;
    this.host = host;

    // 监听协议事件，向上转发
    gb26875Protocol.on('event', (event: ProtocolEvent) => {
      this.emit('event', event);
    });
  }

  /**
   * 启动GB26875服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        const clientIp = socket.remoteAddress || 'unknown';
        logger.info(`[GB26875] 新设备连接: ${clientAddress}`);

        // 注册连接
        const connection: DeviceConnection = {
          socket,
          clientIp,
          connectedAt: new Date(),
          lastActive: new Date(),
        };
        this.connections.set(clientAddress, connection);

        // 帧缓冲区
        let buffer = Buffer.alloc(0);

        socket.on('data', async (data: Buffer | string) => {
          connection.lastActive = new Date();
          const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
          buffer = Buffer.concat([buffer, chunk]);

          // 调试：打印前10个字节
          if (buffer.length > 0 && buffer.length <= 32) {
            logger.debug(`[GB26875] [${clientIp}] buffer: ${buffer.toString('hex').toUpperCase()}`);
          }

          // 尝试解析完整数据包（帧同步）
          while (buffer.length >= 4) {
            // 帧同步：找到0x68起始符
            if (buffer[0] !== 0x68) {
              // 同步失败，跳过一个字节
              logger.debug(`[GB26875] [${clientIp}] 跳过非起始符字节: 0x${buffer[0].toString(16).toUpperCase()}`);
              buffer = buffer.subarray(1);
              continue;
            }

            // 解析长度（先试小端，不行试大端）
            let length = buffer.readUInt16LE(1);
            if (length > 1000) {
              length = buffer.readUInt16BE(1);
            }

            // 总帧长 = 起始符(1) + 长度(2) + length + 结束符(1) = length + 4
            const totalLen = length + 4;
            if (buffer.length < totalLen) {
              // 数据不完整，等待更多数据
              break;
            }

            // 提取完整帧
            const frame = buffer.subarray(0, totalLen);
            buffer = buffer.subarray(totalLen);

            // 解析帧
            const parsed = gb26875Protocol.parseFrame(frame);
            if (parsed) {
              // 处理帧（包含发送应答）
              await gb26875Protocol.handleFrame(parsed, clientIp, socket);

              // 如果是注册帧，更新userCode映射
              if (parsed.cmd === 0x01 && parsed.data.length >= 6) {
                const userCode = parsed.data.subarray(0, 6).toString('ascii').trim();
                connection.userCode = userCode;
                this.userCodeToConnection.set(userCode, connection);
                logger.info(`[GB26875] 设备注册映射: ${userCode} -> ${clientAddress}`);
              }
            }
          }
        });

        socket.on('error', (err) => {
          logger.error(`[GB26875] Socket错误 [${clientAddress}]: ${err.message}`);
        });

        socket.on('close', () => {
          logger.info(`[GB26875] 设备断开连接: ${clientAddress}`);
          this.connections.delete(clientAddress);
          if (connection.userCode) {
            this.userCodeToConnection.delete(connection.userCode);
            logger.info(`[GB26875] 注销设备: ${connection.userCode}`);
          }
        });

        socket.on('timeout', () => {
          logger.warn(`[GB26875] 连接超时: ${clientAddress}`);
          socket.destroy();
        });

        // 设置10分钟超时
        socket.setTimeout(10 * 60 * 1000);
      });

      this.server.listen(this.port, this.host, () => {
        this.running = true;
        logger.info(`[GB26875] ✅ 服务器启动成功，监听 ${this.host}:${this.port}`);
        logger.info(`[GB26875] 等待赋安FSCN8001设备连接...`);
        resolve();
      });

      this.server.on('error', (err) => {
        logger.error(`[GB26875] ❌ 服务器启动失败: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * 停止GB26875服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.running = false;

      // 关闭所有连接
      for (const conn of this.connections.values()) {
        conn.socket.destroy();
      }
      this.connections.clear();
      this.userCodeToConnection.clear();

      if (this.server) {
        this.server.close(() => {
          logger.info('[GB26875] 服务器已停止');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 发送查岗命令到指定设备（精准发送）
   * @param userCode 用户编码（设备注册时上报的6位编码）
   * @returns 是否发送成功
   */
  sendCheckPost(userCode: string): boolean {
    const conn = this.userCodeToConnection.get(userCode);
    if (!conn) {
      logger.warn(`[GB26875] 发送查岗失败: 设备 ${userCode} 不在线`);
      return false;
    }
    return gb26875Protocol.sendCheckPost(conn.socket);
  }

  /**
   * 获取当前在线设备列表
   */
  getOnlineDevices(): Array<{
    userCode?: string;
    clientIp: string;
    connectedAt: Date;
    lastActive: Date;
  }> {
    return Array.from(this.connections.values()).map(conn => ({
      userCode: conn.userCode,
      clientIp: conn.clientIp,
      connectedAt: conn.connectedAt,
      lastActive: conn.lastActive,
    }));
  }

  /**
   * 获取在线设备数量
   */
  getOnlineCount(): number {
    return this.connections.size;
  }

  /**
   * 向已注册设备下发原始控制负载（需设备在线且已映射 userCode）
   */
  sendCommand(systemId: string, _commandType: number, payload: Buffer): boolean {
    const conn = this.userCodeToConnection.get(systemId);
    if (!conn?.socket || conn.socket.destroyed) {
      logger.warn(`[GB26875] sendCommand: 设备 ${systemId} 不在线`);
      return false;
    }
    try {
      conn.socket.write(payload);
      return true;
    } catch (err: any) {
      logger.error(`[GB26875] sendCommand 失败: ${err.message}`);
      return false;
    }
  }

  /**
   * 获取服务器状态
   */
  getStatus(): {
    running: boolean;
    port: number;
    host: string;
    onlineCount: number;
  } {
    return {
      running: this.running,
      port: this.port,
      host: this.host,
      onlineCount: this.connections.size,
    };
  }
}

/** 与 app/backend/gb26875Server.js 一致：默认 5200，避免只跑本仓库 backend 时设备仍连 5200 却无服务 */
const GB26875_TCP_PORT = parseInt(process.env.GB26875_PORT || process.env.GB26875_TCP_PORT || '5200', 10);
const GB26875_HOST = process.env.GB26875_HOST || '0.0.0.0';

// 导出单例
export const gb26875Server = new GB26875Server(GB26875_TCP_PORT, GB26875_HOST);
export default gb26875Server;
