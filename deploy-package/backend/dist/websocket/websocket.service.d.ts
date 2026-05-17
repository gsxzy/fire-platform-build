/**
 * ═══════════════════════════════════════════════════════════════════
 * WebSocket实时通信服务
 * 告警推送、设备状态更新、联动状态广播
 * ═══════════════════════════════════════════════════════════════════
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
export interface WSClient {
    ws: WebSocket;
    userId?: number;
    userName?: string;
    subscribedTopics: Set<string>;
    connectedAt: Date;
}
export interface WSMessage {
    type: string;
    topic?: string;
    data: any;
    timestamp: number;
}
export declare class WebSocketService {
    private static wss;
    private static clients;
    private static redisAlarmBridgeBound;
    private static readonly JWT_SECRET;
    static getWss(): WebSocketServer | null;
    /**
     * 初始化WebSocket服务器（全局仅应调用一次）
     */
    static init(server: http.Server): void;
    /** Redis fire:alarm → 推送给所有在线连接（与旧 index 行为一致） */
    private static bindRedisAlarmBridge;
    /** 广播 { type, data, timestamp } 给所有已连接客户端 */
    static broadcastSimple(type: string, data: unknown): void;
    /** 向指定用户推送 { type, data, timestamp }（JWT userId 需一致） */
    static sendToUserByType(userId: number, type: string, data: unknown): void;
    /**
     * 处理新连接
     */
    private static handleConnection;
    /**
     * 处理客户端消息
     */
    private static handleMessage;
    /**
     * 广播告警
     */
    static broadcastAlarm(alarm: any): Promise<void>;
    /**
     * 广播设备状态更新
     */
    static broadcastDeviceStatus(deviceId: number, status: number): Promise<void>;
    /**
     * 广播联动状态
     */
    static broadcastLinkageStatus(alarmId: number, linkageData: any): Promise<void>;
    /**
     * 广播控制指令状态
     */
    static broadcastCommandStatus(commandId: number, status: number): Promise<void>;
    /**
     * 发送系统通知
     */
    static sendSystemNotify(userId: number, notify: any): Promise<void>;
    /**
     * 广播消息（所有订阅该主题的客户端）
     */
    private static broadcast;
    /**
     * 获取在线客户端数
     */
    static getOnlineCount(): number;
    /**
     * 获取客户端列表
     */
    static getClients(): WSClient[];
    /**
     * 关闭所有连接
     */
    static closeAll(): void;
}
//# sourceMappingURL=websocket.service.d.ts.map