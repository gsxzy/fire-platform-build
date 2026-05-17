import { StreamStatus as ZLMStreamStatus } from './zlm.service';
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
export declare class VideoService {
    static getZLMStreamStatus(cameraId: string): Promise<ZLMStreamStatus | null>;
    static getAllZLMStreamStatus(): Promise<ZLMStreamStatus[]>;
    static startZLMStream(cameraId: string): Promise<boolean>;
    static stopZLMStream(cameraId: string): Promise<boolean>;
    static startAllZLM(): Promise<void>;
    static getWVPDevices(params?: {
        page?: number;
        count?: number;
        query?: string;
        online?: boolean;
    }): Promise<{
        total: number;
        list: any[];
    }>;
    static getWVPChannels(deviceId: string, params?: {
        page?: number;
        count?: number;
        query?: string;
        online?: boolean;
    }): Promise<{
        total: number;
        list: any[];
    }>;
    static startWVPStream(deviceId: string, channelId: string): Promise<UnifiedStreamInfo>;
    static stopWVPStream(deviceId: string, channelId: string): Promise<any>;
    static wvpPTZControl(deviceId: string, channelId: string, cmd: number, horizonSpeed?: number, verticalSpeed?: number, zoomSpeed?: number): Promise<any>;
    static wvpPresetControl(deviceId: string, channelId: string, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<any>;
    static wvpPlayback(deviceId: string, channelId: string, startTime: string, endTime: string): Promise<any>;
    static wvpSnapshot(deviceId: string, channelId: string): Promise<string>;
    static wvpDeviceStatus(deviceId: string): Promise<any>;
    /**
     * 获取视频设备列表（自动判断 WVP/ZLM）
     */
    static getVideoDevices(params?: {
        page?: number;
        count?: number;
        query?: string;
        online?: boolean;
    }): Promise<{
        total: number;
        list: any[];
    }>;
    /**
     * 获取设备通道列表
     */
    static getDeviceChannels(deviceId: string, params?: {
        page?: number;
        count?: number;
    }): Promise<{
        total: number;
        list: any[];
    }>;
    /**
     * 统一取流（POST /stream 核心接口）
     */
    static getUnifiedStream(deviceId: string, channelId?: string): Promise<UnifiedStreamInfo | null>;
    /**
     * 停止播放
     */
    static stopStream(deviceId: string, channelId?: string): Promise<boolean>;
    /**
     * PTZ 云台控制
     */
    static ptzControl(deviceId: string, channelId: string | undefined, cmd: number | string, params?: any): Promise<boolean>;
    /**
     * 预设位控制
     */
    static presetControl(deviceId: string, channelId: string | undefined, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<boolean>;
    /**
     * 录像回放
     */
    static getPlayback(deviceId: string, channelId: string | undefined, startTime: string, endTime: string): Promise<any>;
    /**
     * 截图
     */
    static snapshot(deviceId: string, channelId?: string): Promise<{
        snapUrl?: string;
        buffer?: Buffer;
    } | null>;
    /**
     * 获取摄像头配置列表（ZLM）
     */
    static getCameraConfigs(): any[];
    private static wvpPlayToPayload;
    private static getDBVideoDevices;
    private static safeParseConfig;
}
//# sourceMappingURL=video.service.d.ts.map