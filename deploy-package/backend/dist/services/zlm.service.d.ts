interface CameraConfig {
    name: string;
    ip: string;
    username: string;
    password: string;
    channel: number;
    streamKey: string;
}
export interface StreamStatus {
    cameraId: string;
    name: string;
    streamKey: string;
    isAlive: boolean;
    flv: string;
    hls: string;
    rtmp: string;
    wsFlv: string;
}
export declare class ZLMService {
    /**
     * 获取支持的摄像头 ID 列表
     */
    static getCameraIds(): string[];
    /**
     * 获取指定摄像头配置
     */
    static getCameraConfig(cameraId: string): CameraConfig | null;
    /**
     * 通过 ZLMediaKit 添加流代理
     */
    static addStreamProxy(cameraId: string): Promise<boolean>;
    /**
     * 获取流状态
     */
    static getStreamStatus(cameraId: string): Promise<StreamStatus | null>;
    /**
     * 获取所有流状态
     */
    static getAllStreamStatus(): Promise<StreamStatus[]>;
    /**
     * 启动指定摄像头推流
     */
    static startStream(cameraId: string): Promise<boolean>;
    /**
     * 停止指定摄像头推流
     */
    static stopStream(cameraId: string): Promise<boolean>;
    /**
     * 获取播放地址（不检测状态）
     */
    static getPlayUrls(cameraId: string): Pick<StreamStatus, 'flv' | 'hls' | 'rtmp' | 'wsFlv'> | null;
    /**
     * 自动添加所有摄像头代理
     */
    static startAll(): Promise<void>;
}
export {};
//# sourceMappingURL=zlm.service.d.ts.map