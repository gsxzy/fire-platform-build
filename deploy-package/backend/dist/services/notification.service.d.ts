export declare class NotificationService {
    private static transporter;
    static init(): void;
    static sendAlarmNotify(alarm: any): Promise<void>;
    static sendContractExpireNotify(contract: any): Promise<void>;
    static sendDeviceOfflineNotify(device: any): Promise<void>;
    static sendPatrolOverdueNotify(plan: any): Promise<void>;
    static sendEmail(to: string, subject: string, content: string): Promise<{
        success: boolean;
        msg?: undefined;
    } | {
        success: boolean;
        msg: any;
    }>;
    static sendWithTemplate(templateCode: string, to: string, variables: Record<string, string>): Promise<{
        success: boolean;
        msg?: undefined;
    } | {
        success: boolean;
        msg: any;
    }>;
}
//# sourceMappingURL=notification.service.d.ts.map