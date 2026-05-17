/** trigger_condition JSON（与前端安消联动页对齐） */
export interface LinkageTriggerConditionV2 {
    version?: number;
    type?: string;
    trigger?: string;
    triggerDesc?: string;
    priority?: 'high' | 'medium' | 'low';
    timeRange?: string;
    units?: string[];
    deviceTypes?: string[];
    targets?: string[];
    description?: string;
    /** 限制的告警类型，空或不填则仅受全局类型/级别策略约束 */
    alarmTypes?: number[];
}
export interface LinkageAction {
    deviceId: number;
    command: string;
    params: any;
    delay?: number;
}
export interface LinkagePlan {
    triggerAlarmId: number;
    actions: LinkageAction[];
    status: 'pending' | 'executing' | 'completed' | 'failed';
    startTime: Date;
    completedTime?: Date;
    results: any[];
}
export declare class LinkageService {
    private static readonly LINKAGE_REDIS_KEY;
    private static readonly LINKAGE_CACHE_TTL;
    /**
     * 告警触发联动
     */
    static triggerLinkage(alarmId: number, userId?: number, userName?: string): Promise<LinkagePlan | null>;
    /**
     * 执行联动计划
     */
    private static executeLinkage;
    /**
     * 获取联动计划状态
     */
    static getLinkageStatus(alarmId: number): Promise<LinkagePlan | null>;
    /**
     * 手动触发联动
     */
    static manualTrigger(ruleId: number, userId: number, userName: string): Promise<LinkagePlan | null>;
    /**
     * 获取命令类型
     */
    private static getCommandType;
    /**
     * 延时等待
     */
    private static sleep;
    /**
     * 常见联动方案
     */
    static readonly PRESET_PLANS: {
        fireAlarm: {
            name: string;
            actions: {
                command: string;
                delay: number;
                description: string;
            }[];
        };
        falseAlarm: {
            name: string;
            actions: {
                command: string;
                delay: number;
                description: string;
            }[];
        };
        drill: {
            name: string;
            actions: {
                command: string;
                delay: number;
                description: string;
            }[];
        };
    };
    /**
     * 应用预设联动方案
     */
    static applyPresetPlan(planType: 'fireAlarm' | 'falseAlarm' | 'drill', deviceIds: number[], userId: number, userName: string): Promise<void>;
}
//# sourceMappingURL=linkage.service.d.ts.map