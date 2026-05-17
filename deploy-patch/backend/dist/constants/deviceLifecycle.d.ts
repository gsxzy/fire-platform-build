/** fire_device.lifecycle_status 与业务流程对齐
 * 核心流程：设备档案入库 → 设备接入平台 → 设备分配到单位 → 设备业务配置/维护
 * 数据唯一源头：所有设备必须先在【设备档案】完成入库登记，生成唯一SN/设备ID
 */
export declare const DeviceLifecycleStatus: {
    readonly DRAFT: 0;
    readonly REGISTERED: 1;
    readonly PLATFORM_CONNECTED: 2;
    readonly ASSIGNED: 3;
    readonly MAINTENANCE: 4;
    readonly SCRAPPED: 5;
};
export type DeviceLifecycleStatusValue = (typeof DeviceLifecycleStatus)[keyof typeof DeviceLifecycleStatus];
export declare const DEVICE_LIFECYCLE_LABELS: Record<number, string>;
/** 可操作状态校验助手 */
export declare const DeviceLifecycleRules: {
    /** 是否允许接入平台：已入库/已接入/已分配设备均可重新配置接入 */
    readonly canConnect: (status: number) => boolean;
    /** 是否允许分配单位：仅已接入设备 */
    readonly canAllocate: (status: number) => status is 2;
    /** 是否允许业务配置：已接入/已分配/维护中 */
    readonly canConfigure: (status: number) => boolean;
    /** 是否允许删除档案：仅草稿/已入库（未接入） */
    readonly canDeleteArchive: (status: number) => boolean;
    /** 是否允许报废：非报废状态 */
    readonly canScrap: (status: number) => boolean;
    /** 是否允许维护：已分配的设备 */
    readonly canMaintain: (status: number) => status is 3;
    /** 操作错误提示文案 */
    readonly messages: {
        readonly connect: "仅允许为「已入库/已接入/已分配」状态的设备配置平台接入（草稿/维护中/报废设备不可接入）";
        readonly allocate: "仅允许为「已接入」状态的设备分配单位";
        readonly configure: "设备尚未接入平台，请先完成「设备接入」";
        readonly deleteArchive: "已接入或已分配的设备请先「移除接入」或「报废」，不可直接删除档案";
        readonly scrap: "设备已报废";
    };
};
//# sourceMappingURL=deviceLifecycle.d.ts.map