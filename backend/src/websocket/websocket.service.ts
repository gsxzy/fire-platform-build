/**
 * ═══════════════════════════════════════════════════════════════════
 * WebSocket实时通信服务
 * 告警推送、设备状态更新、联动状态广播
 * ═══════════════════════════════════════════════════════════════════
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import redis from '@/config/redis';
import logger from '@/config/logger';
import { SECRET } from '@/utils/jwt';
import { Device, ControlCommand } from '@/models';

export interface WSClient {
  ws: WebSocket;
  userId?: number;
  userName?: string;
  subscribedTopics: Set<string>;
  connectedAt: Date;
}

export interface WSMessage {
  type: string;           // new_alarm, device_status, linkage_status, system_notify
  topic?: string;
  data: any;
  timestamp: number;
}

export class WebSocketService {
  private static wss: WebSocketServer | null = null;
  private static clients: Map<WebSocket, WSClient> = new Map();
  private static redisAlarmBridgeBound = false;
  private static readonly JWT_SECRET = SECRET;

  static getWss(): WebSocketServer | null {
    return this.wss;
  }

  /**
   * 初始化WebSocket服务器（全局仅应调用一次）
   */
  static init(server: http.Server) {
    if (this.wss) {
      logger.warn('[WS] init() called again; existing server kept, skip duplicate attach');
      return;
    }

    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (err) => {
      logger.error(`[WS] Server error: ${err.message}`);
    });

    this.bindRedisAlarmBridge();

    logger.info('[WS] Server initialized');
  }

  /** Redis fire:alarm → 推送给所有在线连接（与旧 index 行为一致） */
  private static bindRedisAlarmBridge() {
    if (this.redisAlarmBridgeBound) return;
    this.redisAlarmBridgeBound = true;

    const subRedis = redis.duplicate();
    subRedis.subscribe('fire:alarm', (err) => {
      if (err) logger.error('[WS] Redis subscribe error:', err);
      else logger.info('[WS] Subscribed to fire:alarm');
    });

    subRedis.on('message', (channel, message) => {
      if (channel !== 'fire:alarm') return;
      try {
        const payload = JSON.parse(message as string);
        // payload = { type: 'new_alarm', data: alarm }
        this.broadcastAlarm(payload.data);
      } catch (e: any) {
        logger.error(`[WS] Invalid Redis alarm payload: ${e?.message}`);
      }
    });
  }

  /** 广播 { type, data, timestamp } 给所有已连接客户端 */
  static broadcastSimple(type: string, data: unknown) {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  /** 向指定用户推送 { type, data, timestamp }（JWT userId 需一致） */
  static sendToUserByType(userId: number, type: string, data: unknown) {
    const payload = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const [ws, client] of this.clients.entries()) {
      if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * 处理新连接
   */
  private static async handleConnection(ws: WebSocket, req: http.IncomingMessage) {
    const client: WSClient = {
      ws,
      subscribedTopics: new Set(),
      connectedAt: new Date()
    };

    // 验证 JWT：支持 Authorization 头或查询参数 ?token=（浏览器 WebSocket 常用）
    let token = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
    if (!token && req.url) {
      try {
        token = new URL(req.url, 'http://localhost').searchParams.get('token') || '';
      } catch {
        token = '';
      }
    }
    if (token) {
      try {
        const decoded: any = jwt.verify(token, this.JWT_SECRET);
        client.userId = decoded.userId ?? decoded.id;
        client.userName = decoded.username;
      } catch {
        logger.warn('[WS] Invalid JWT token');
        try {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: '认证失败' },
            timestamp: Date.now()
          }));
        } catch { /* ignore */ }
        try {
          ws.close();
        } catch { /* ignore */ }
        return;
      }
    }

    // 保存客户端
    this.clients.set(ws, client);

    // 设置心跳
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    ws.on('message', (message: string) => {
      this.handleMessage(ws, message, client);
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(ws);
      logger.info(`[WS] Client disconnected: ${client.userName || 'anonymous'}`);
    });

    ws.on('error', (err) => {
      logger.error(`[WS] Client error: ${err.message}`);
    });

    // 发送连接成功消息
    ws.send(JSON.stringify({
      type: 'connected',
      data: { userId: client.userId, userName: client.userName },
      timestamp: Date.now()
    }));

    logger.info(`[WS] New connection: ${client.userName || 'anonymous'}`);
  }

  /**
   * 处理客户端消息
   */
  private static async handleMessage(ws: WebSocket, message: string, client: WSClient) {
    try {
      const msg: WSMessage = JSON.parse(message);

      switch (msg.type) {
        case 'subscribe':
          // 订阅主题
          if (msg.topic) {
            client.subscribedTopics.add(msg.topic);
            logger.info(`[WS] Client subscribed to: ${msg.topic}`);
          }
          break;

        case 'unsubscribe':
          // 取消订阅
          if (msg.topic) {
            client.subscribedTopics.delete(msg.topic);
          }
          break;

        case 'ping':
          // 心跳响应
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;

        default:
          logger.warn(`[WS] Unknown message type: ${msg.type}`);
      }
    } catch (err: any) {
      logger.error(`[WS] Message handling error: ${err.message}`);
    }
  }

  /**
   * 广播告警
   */
  static async broadcastAlarm(alarm: any) {
    const message: WSMessage = {
      type: 'new_alarm',
      data: {
        id: alarm.id,
        alarm_no: alarm.alarm_no,
        alarm_type: alarm.alarm_type,
        alarm_level: alarm.alarm_level,
        device_id: alarm.device_id,
        device_name: alarm.device_name,
        unit_id: alarm.unit_id,
        unit_name: alarm.unit_name,
        location: alarm.location,
        alarm_desc: alarm.alarm_desc,
        status: alarm.status,
        created_at: alarm.created_at
      },
      timestamp: Date.now()
    };

    this.broadcast(message, 'alarm');
  }

  /**
   * 广播设备状态更新
   */
  static async broadcastDeviceStatus(deviceId: number, status: number) {
    const device = await Device.findByPk(deviceId) as any;

    const message: WSMessage = {
      type: 'device_status',
      data: {
        id: device?.id,
        device_no: device?.device_no,
        device_name: device?.device_name,
        device_type: device?.device_type,
        status: status,
        last_online: new Date()
      },
      timestamp: Date.now()
    };

    this.broadcast(message, 'device');
  }

  /**
   * 广播联动状态
   */
  static async broadcastLinkageStatus(alarmId: number, linkageData: any) {
    const message: WSMessage = {
      type: 'linkage_status',
      data: {
        alarmId,
        status: linkageData.status,
        actions: linkageData.actions,
        results: linkageData.results,
        startTime: linkageData.startTime,
        completedTime: linkageData.completedTime
      },
      timestamp: Date.now()
    };

    this.broadcast(message, 'linkage');
  }

  /**
   * 广播控制指令状态
   */
  static async broadcastCommandStatus(commandId: number, status: number) {
    const command = await ControlCommand.findByPk(commandId) as any;

    let parsedResult: unknown = null;
    if (command?.result) {
      try {
        parsedResult = JSON.parse(command.result);
      } catch {
        parsedResult = command.result;
      }
    }

    const message: WSMessage = {
      type: 'command_status',
      data: {
        id: command?.id,
        cmd_no: command?.cmd_no,
        device_id: command?.device_id,
        device_name: command?.device_name,
        status: status,
        result: parsedResult,
        execute_time: command?.execute_time
      },
      timestamp: Date.now()
    };

    this.broadcast(message, 'command');
  }

  /**
   * 发送系统通知
   */
  static async sendSystemNotify(userId: number, notify: any) {
    const message: WSMessage = {
      type: 'system_notify',
      data: {
        userId,
        ...notify
      },
      timestamp: Date.now()
    };

    // 发送给指定用户
    for (const [ws, client] of this.clients.entries()) {
      if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * 广播消息（所有订阅该主题的客户端）
   */
  private static broadcast(message: WSMessage, topic: string) {
    const messageStr = JSON.stringify(message);

    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        // 如果客户端订阅了主题，或者是系统管理员
        if (client.subscribedTopics.has(topic) || client.subscribedTopics.has('all')) {
          ws.send(messageStr);
        }
      }
    }

    logger.info(`[WS] Broadcast: ${message.type} to ${this.clients.size} clients`);
  }

  /**
   * 获取在线客户端数
   */
  static getOnlineCount(): number {
    return this.clients.size;
  }

  /**
   * 获取客户端列表
   */
  static getClients(): WSClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * 关闭所有连接
   */
  static closeAll() {
    for (const [ws] of this.clients.entries()) {
      ws.close();
    }
    this.clients.clear();
    logger.info('[WS] All connections closed');
  }
}