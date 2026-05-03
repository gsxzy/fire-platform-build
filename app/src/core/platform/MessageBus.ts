/**
 * ═══════════════════════════════════════════════════════════════════
 * Kafka风格消息总线 - 跨模块异步通信
 * 所有模块间通信必须通过此总线，禁止直接耦合调用
 * ═══════════════════════════════════════════════════════════════════
 */
import type { BusMessage, MessageHandler } from './types';

type HandlerEntry = { handler: MessageHandler; once: boolean };

class MessageBusCore {
  private handlers: Map<string, HandlerEntry[]> = new Map();
  private history: BusMessage[] = [];
  private maxHistory = 1000;

  /* ── 订阅主题 ── */
  on(topic: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, []);
    this.handlers.get(topic)!.push({ handler, once: false });
    return () => this.off(topic, handler);
  }

  /* ── 一次性订阅 ── */
  once(topic: string, handler: MessageHandler): void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, []);
    this.handlers.get(topic)!.push({ handler, once: true });
  }

  /* ── 取消订阅 ── */
  off(topic: string, handler: MessageHandler): void {
    const list = this.handlers.get(topic);
    if (!list) return;
    const idx = list.findIndex(h => h.handler === handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  /* ── 发布消息 ── */
  publish(topic: string, payload: unknown, sender = 'system'): void {
    const msg: BusMessage = { topic, payload, sender, timestamp: Date.now() };
    this.history.push(msg);
    if (this.history.length > this.maxHistory) this.history.shift();

    // 通知该主题的所有订阅者
    const list = this.handlers.get(topic) || [];
    const toRemove: number[] = [];
    list.forEach((entry, i) => {
      try { entry.handler(msg); } catch (e) { console.error(`[Bus] Handler error on ${topic}:`, e); }
      if (entry.once) toRemove.push(i);
    });
    // 清理一次性订阅者
    toRemove.reverse().forEach(i => list.splice(i, 1));

    // 通配符订阅者
    if (!topic.includes('*')) {
      const wcList = this.handlers.get('*') || [];
      wcList.forEach(entry => {
        try { entry.handler(msg); } catch (e) { console.error(`[Bus] Wildcard handler error:`, e); }
      });
    }
  }

  /* ── 获取历史消息 ── */
  getHistory(topic?: string, limit = 50): BusMessage[] {
    let result = [...this.history];
    if (topic) result = result.filter(m => m.topic === topic);
    return result.slice(-limit);
  }

  /* ── 清除历史 ── */
  clearHistory(): void { this.history = []; }
}

/* 单例导出 */
export const MessageBus = new MessageBusCore();

/* 便捷Hook风格API */
export const bus = {
  on: (topic: string, handler: MessageHandler) => MessageBus.on(topic, handler),
  once: (topic: string, handler: MessageHandler) => MessageBus.once(topic, handler),
  off: (topic: string, handler: MessageHandler) => MessageBus.off(topic, handler),
  publish: (topic: string, payload: unknown, sender?: string) => MessageBus.publish(topic, payload, sender),
  history: (topic?: string, limit?: number) => MessageBus.getHistory(topic, limit),
  clear: () => MessageBus.clearHistory(),
};

/* 预定义主题常量 */
export const TOPICS = {
  // 告警相关
  ALARM_FIRE: 'alarm:fire',
  ALARM_FAULT: 'alarm:fault',
  ALARM_WARNING: 'alarm:warning',
  ALARM_HANDLED: 'alarm:handled',
  ALARM_STATS_CHANGED: 'alarm:stats:changed',

  // 设备相关
  DEVICE_ONLINE: 'device:online',
  DEVICE_OFFLINE: 'device:offline',
  DEVICE_STATUS_CHANGED: 'device:status:changed',

  // 模块开关
  MODULE_ENABLED: 'module:enabled',
  MODULE_DISABLED: 'module:disabled',
  MODULE_STATUS_CHANGED: 'module:status:changed',

  // 系统
  SYSTEM_LOG: 'system:log',
  SYSTEM_NOTIFICATION: 'system:notification',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
} as const;
