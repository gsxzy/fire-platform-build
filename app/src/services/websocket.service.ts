/**
 * ═══════════════════════════════════════════════════════════════════
 * 前端WebSocket实时通信服务
 * 告警推送、设备状态更新、联动状态
 * ═══════════════════════════════════════════════════════════════════
 */

export interface WSMessage {
  type: string;
  topic?: string;
  data: any;
  timestamp: number;
}

export interface WSOptions {
  onAlarm?: (alarm: any) => void;
  onDeviceStatus?: (device: any) => void;
  onLinkage?: (linkage: any) => void;
  onCommand?: (command: any) => void;
  onNotify?: (notify: any) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private options: WSOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly heartbeatTimeoutMs = 10000;
  private subscribedTopics: Set<string> = new Set();
  private messageQueue: any[] = [];
  private isManualClose = false;

  constructor(url: string, token: string, options: WSOptions = {}) {
    this.url = url;
    this.token = token;
    this.options = options;
  }

  /**
   * 连接WebSocket
   */
  connect() {
    try {
      // 构建WebSocket URL（带token）
      const wsUrl = `${this.url}?token=${this.token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        const wasReconnect = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;

        // 恢复之前的订阅
        if (wasReconnect && this.subscribedTopics.size > 0) {
          console.log(`[WS] Restoring ${this.subscribedTopics.size} subscriptions`);
          this.subscribedTopics.forEach(topic => {
            this.send({ type: 'subscribe', topic });
          });
        }

        // 发送队列中的消息
        this.flushMessageQueue();

        // 启动心跳
        this.startHeartbeat();

        // 调用连接成功回调
        if (this.options.onConnect) {
          this.options.onConnect();
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[WS] Message parse error:', err);
        }
      };

      this.ws.onerror = (err: Event) => {
        console.error('[WS] Error:', err);
        if (this.options.onError) {
          this.options.onError(err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[WS] Disconnected (code: ${event.code}, clean: ${event.wasClean})`);
        this.stopHeartbeat();

        // 调用断开连接回调
        if (this.options.onDisconnect) {
          this.options.onDisconnect();
        }

        // 非手动关闭时自动重连
        if (!this.isManualClose) {
          this.reconnect();
        }
      };
    } catch (err) {
      console.error('[WS] Connect error:', err);
      if (this.options.onError) {
        this.options.onError(err);
      }
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'connected':
        console.log('[WS] Server connected:', message.data);
        break;

      case 'ping':
        // 响应心跳
        this.send({ type: 'pong' });
        break;

      case 'pong':
        // 心跳响应
        this.handlePong();
        break;

      case 'new_alarm':
        console.log('[WS] New alarm:', message.data);
        if (this.options.onAlarm) {
          this.options.onAlarm(message.data);
        }
        break;

      case 'device_status':
        console.log('[WS] Device status:', message.data);
        if (this.options.onDeviceStatus) {
          this.options.onDeviceStatus(message.data);
        }
        break;

      case 'linkage_status':
        console.log('[WS] Linkage status:', message.data);
        if (this.options.onLinkage) {
          this.options.onLinkage(message.data);
        }
        break;

      case 'command_status':
        console.log('[WS] Command status:', message.data);
        if (this.options.onCommand) {
          this.options.onCommand(message.data);
        }
        break;

      case 'system_notify':
        console.log('[WS] System notify:', message.data);
        if (this.options.onNotify) {
          this.options.onNotify(message.data);
        }
        break;

      case 'error':
        console.error('[WS] Server error:', message.data);
        if (this.options.onError) {
          this.options.onError(message.data);
        }
        break;

      default:
        console.log('[WS] Unknown message type:', message.type);
    }
  }

  /**
   * 订阅主题
   */
  subscribe(topic: string) {
    this.subscribedTopics.add(topic);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', topic });
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(topic: string) {
    this.subscribedTopics.delete(topic);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', topic });
    }
  }

  /**
   * 发送消息（支持断线队列）
   */
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // 断线时缓存消息（排除心跳）
      if (message.type !== 'ping' && message.type !== 'pong') {
        this.messageQueue.push(message);
        console.log(`[WS] Queued message (${this.messageQueue.length} in queue)`);
      }
    }
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;
    console.log(`[WS] Flushing ${this.messageQueue.length} queued messages`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    queue.forEach(msg => this.send(msg));
  }

  /**
   * 启动心跳（带超时检测）
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      this.send({ type: 'ping' });
      this.heartbeatTimeout = setTimeout(() => {
        console.warn('[WS] Heartbeat timeout, closing connection');
        this.ws?.close();
      }, this.heartbeatTimeoutMs);
    }, 30000); // 30秒心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * 响应心跳
   */
  private handlePong() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * 计算指数退避延迟
   */
  private getReconnectDelay(): number {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    // 添加随机抖动避免惊群
    return delay + Math.random() * 1000;
  }

  /**
   * 重连
   */
  private reconnect() {
    if (this.isManualClose) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached, giving up');
      if (this.options.onError) {
        this.options.onError(new Error('WebSocket连接失败，已达到最大重试次数'));
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.getReconnectDelay();
    console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * 创建全局WebSocket客户端实例
 */
let globalWSClient: WebSocketClient | null = null;

export function initWebSocket(token: string, options: WSOptions = {}) {
  const wsUrl = (import.meta as any).env?.VITE_WS_URL || `ws://localhost:3000/ws`;

  // 生产环境且 WS 地址为 localhost 时，跳过连接避免报错
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const isLocalWs = wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1');
  if (!isLocalhost && isLocalWs) {
    console.log('[WS] Production env with localhost WS URL, skipping connection');
    return null;
  }

  if (globalWSClient) {
    globalWSClient.disconnect();
  }

  globalWSClient = new WebSocketClient(wsUrl, token, options);
  globalWSClient.connect();

  return globalWSClient;
}

export function getWebSocketClient(): WebSocketClient | null {
  return globalWSClient;
}

export function closeWebSocket() {
  if (globalWSClient) {
    globalWSClient.disconnect();
    globalWSClient = null;
  }
}