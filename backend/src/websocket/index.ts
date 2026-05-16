/**
 * ═══════════════════════════════════════════════════════════════════
 * WebSocket 实时推送服务
 * 告警实时推送、设备状态变更、工单通知
 * 仅挂载一套 WebSocketServer（实现见 websocket.service.ts）
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Server } from 'http';
import type { WebSocketServer } from 'ws';
import { WebSocketService } from './websocket.service';

export function initWebSocket(server: Server): WebSocketServer | null {
  WebSocketService.init(server);
  return WebSocketService.getWss();
}
