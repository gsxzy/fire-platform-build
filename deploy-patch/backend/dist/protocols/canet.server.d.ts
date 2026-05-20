export declare class CanetServer {
    private server;
    private connections;
    private readonly port;
    private readonly host;
    constructor(port: number, host: string);
    start(): void;
    stop(): Promise<void>;
    private handleConnection;
    private parseFuanAlarmFrame;
    private handleFrame;
    private findDeviceBinding;
    private createAlarm;
    getStats(): any[];
}
export declare const canetServer: CanetServer;
export default canetServer;
//# sourceMappingURL=canet.server.d.ts.map