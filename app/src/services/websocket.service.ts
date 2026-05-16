/// src/services/websocket.service.ts
import { logger } from '@/lib/logger';

interface WsCallbacks {
  onConnect?: () => void;
  onAlarm?: (alarm: any) => void;
  onDeviceStatus?: (device: any) => void;
  onError?: (error: any) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private callbacks: WsCallbacks = {};
  private subscribedTopics: Set<string> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor(url: string, callbacks: WsCallbacks = {}) {
    this.url = url;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info('[WS] 连接成功');
        // 重新订阅之前的话题
        this.subscribedTopics.forEach(topic => this.sendSubscribe(topic));
        this.callbacks.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'new_alarm' && msg.data) {
            this.callbacks.onAlarm?.(msg.data);
          } else if (msg.type === 'device_status' && msg.data) {
            this.callbacks.onDeviceStatus?.(msg.data);
          }
        } catch {
          logger.info('[WS] 收到消息:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('[WS] 错误:', error);
        this.callbacks.onError?.(error);
      };

      this.ws.onclose = () => {
        logger.warn('[WS] 断开连接，5秒后重连...');
        this.scheduleReconnect();
      };
    } catch (err) {
      logger.error('[WS] 创建连接失败:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private sendSubscribe(topic: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', topic }));
    }
  }

  subscribe(topic: string) {
    this.subscribedTopics.add(topic);
    this.sendSubscribe(topic);
  }

  unsubscribe(topic: string) {
    this.subscribedTopics.delete(topic);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', topic }));
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscribedTopics.clear();
    this.ws?.close();
    this.ws = null;
  }
}

// 全局实例
let globalWsClient: WebSocketClient | null = null;

function initWebSocket(token: string, callbacks: WsCallbacks = {}): WebSocketClient | null {
  // 关闭旧连接
  closeWebSocket();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

  globalWsClient = new WebSocketClient(wsUrl, callbacks);
  return globalWsClient;
}

function closeWebSocket() {
  if (globalWsClient) {
    globalWsClient.close();
    globalWsClient = null;
    logger.info('[WS] 连接已关闭');
  }
}

// 暴露到全局方便调试
(window as any).wsService = { initWebSocket, closeWebSocket, getClient: () => globalWsClient };

export { initWebSocket, closeWebSocket };
export type { WsCallbacks };
