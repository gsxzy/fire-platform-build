export declare class ControlRoomService {
    static getHostsByRoom(roomId: number): Promise<import("sequelize").Model<any, any>[]>;
    static getHostDetail(hostId: number): Promise<{
        host: any;
        multilinePanels: import("sequelize").Model<any, any>[];
        busPoints: import("sequelize").Model<any, any>[];
    } | null>;
    static silenceHost(hostId: number, operatorId: number, operatorName: string): Promise<{
        success: boolean;
        msg: string;
        logId?: undefined;
    } | {
        success: boolean;
        msg: string;
        logId: any;
    }>;
    static resetHost(hostId: number, operatorId: number, operatorName: string): Promise<{
        success: boolean;
        msg: string;
        logId?: undefined;
    } | {
        success: boolean;
        msg: string;
        logId: any;
    }>;
    static switchMode(hostId: number, mode: 'manual' | 'auto', operatorId: number, operatorName: string): Promise<{
        success: boolean;
        msg: any;
    }>;
    static controlMultiline(hostId: number, pointId: number, action: 'start' | 'stop', operatorId: number, operatorName: string): Promise<{
        success: boolean;
        msg: any;
    }>;
    static getCommandLogs(hostId?: number, pageNum?: number, pageSize?: number): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
}
//# sourceMappingURL=controlRoom.service.d.ts.map