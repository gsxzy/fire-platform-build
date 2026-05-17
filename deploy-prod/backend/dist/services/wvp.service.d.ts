export declare function getVideoDevices(params?: {
    page?: number;
    count?: number;
    query?: string;
    online?: boolean;
}): Promise<{
    total: number;
    list: any[];
}>;
export declare function getDeviceChannels(deviceId: string, params?: {
    page?: number;
    count?: number;
    query?: string;
    online?: boolean;
}): Promise<{
    total: number;
    list: any[];
}>;
export interface WVPStreamInfo {
    deviceId: string;
    channelId: string;
    flv: string;
    hls: string;
    rtmp: string;
    rtsps: string;
    rtc: string;
    wsFlv: string;
    wsHls: string;
    httpsFlv: string;
    httpsHls: string;
    streamId: string;
    mediaServerId: string;
    startTime: string;
    ssrc: string;
}
export declare function getStream(deviceId: string, channelId: string): Promise<WVPStreamInfo>;
export declare function stopStream(deviceId: string, channelId: string): Promise<any>;
export declare function ptzControl(deviceId: string, channelId: string, cmd: number, horizonSpeed?: number, verticalSpeed?: number, zoomSpeed?: number): Promise<any>;
export declare function presetControl(deviceId: string, channelId: string, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<any>;
export interface WVPPlaybackInfo {
    deviceId: string;
    channelId: string;
    flv: string;
    hls: string;
    rtmp: string;
    wsFlv: string;
    streamId: string;
    startTime: string;
    endTime: string;
    duration: number;
}
export declare function getPlayback(deviceId: string, channelId: string, startTime: string, endTime: string): Promise<WVPPlaybackInfo>;
export declare function snapshot(deviceId: string, channelId: string): Promise<string>;
export declare function getDeviceStatus(deviceId: string): Promise<any>;
//# sourceMappingURL=wvp.service.d.ts.map