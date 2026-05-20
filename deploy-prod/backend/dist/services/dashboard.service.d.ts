export declare class DashboardService {
    static getWorkbenchData(userId: number): Promise<{
        alarm: {
            pending: number;
            today: number;
            trend: {
                day: string;
                fire: number;
                fault: number;
                warn: number;
            }[];
            monthTotal: number;
            monthHandled: number;
            monthHandledRate: string;
        };
        device: {
            total: number;
            online: number;
            offline: number;
            rate: string;
            byType: {
                name: string;
                total: number;
                online: number;
            }[];
            activeTotal: number;
            activeOnline: number;
            activeOffline: number;
            activeRate: string;
        };
        workOrder: {
            pending: number;
        };
        patrol: {
            today: number;
        };
        hazard: {
            pending: number;
        };
        unit: {
            total: number;
            onlineRate: string;
        };
        inspection: {
            month: number;
        };
        user: {
            total: number;
        };
        stats: {
            todayFire: number;
            todayFault: number;
            alarmPending: number;
            workOrderPending: number;
            patrolToday: number;
            hazardPending: number;
            unitTotal: number;
            deviceOnline: number;
            unitOnlineRate: string;
            deviceOnlineRate: string;
            deviceActiveTotal: number;
            deviceActiveOnline: number;
            deviceActiveRate: string;
        };
        alarmTrend: {
            day: string;
            fire: number;
            fault: number;
            warn: number;
        }[];
        deviceOnline: {
            name: string;
            total: number;
            online: number;
        }[];
        unitStatus: {
            name: string;
            value: number;
            color: string;
        }[];
        weeklyStats: {
            week: string;
            alarms: number;
            handled: number;
        }[];
        shortcuts: {
            label: string;
            path: string;
            icon: string;
            color: string;
            bg: string;
            border: string;
            badge: string;
        }[];
        todos: {
            id: number;
            title: string;
            priority: "urgent" | "high" | "normal";
            time: string;
        }[];
        duty: {
            name: string;
            phone: string;
        };
        summaryMonth: {
            alarmTotal: number;
            handled: number;
            handleRate: string;
        };
    }>;
    private static _fetchWorkbenchData;
    private static buildWeeklyAlarmStats;
    static getMonitorOverview(): Promise<{
        deviceStats: import("sequelize").Model<any, any>[];
        alarmStats: import("sequelize").Model<any, any>[];
        unitStats: import("sequelize").Model<any, any>[];
    }>;
    static getBigScreenData(): Promise<{
        summary: {
            unitCount: number;
            deviceCount: number;
            onlineCount: number;
            onlineRate: string | number;
            alarmTotal: number;
            alarmToday: number;
        };
        workOrder: {
            total: number;
            done: number;
        };
        patrol: {
            month: number;
        };
        hazard: {
            total: number;
        };
        inspection: {
            month: number;
        };
        recentAlarms: {
            device: any;
            unit: any;
            time: string;
            type: string;
            level: string;
        }[];
        alarmTrend: any[];
        hourlyData: {
            hour: string;
            alarm: number;
            fault: number;
        }[];
        unitAlarmData: {
            name: any;
            value: number;
        }[];
        deviceTypeDist: {
            name: any;
            value: number;
            color: string;
        }[];
        systems: {
            name: any;
            status: string;
            color: string;
        }[];
    }>;
    private static _fetchBigScreenData;
    private static buildHourlyAlarmStats;
    static getBigScreenConfig(): Promise<{
        screenName: any;
        layout: any;
        widgets: {
            type: any;
            name: any;
            config: any;
            x: any;
            y: any;
            width: any;
            height: any;
        }[];
    } | null>;
}
//# sourceMappingURL=dashboard.service.d.ts.map