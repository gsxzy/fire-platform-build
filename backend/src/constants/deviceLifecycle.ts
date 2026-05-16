/** fire_device.lifecycle_status 与业务流程对齐
 * 核心流程：设备档案入库 → 设备接入平台 → 设备分配到单位 → 设备业务配置/维护
 * 数据唯一源头：所有设备必须先在【设备档案】完成入库登记，生成唯一SN/设备ID
 */
export const DeviceLifecycleStatus = {
  DRAFT: 0,             // 草稿/预登记：初步录入，尚未正式入库，不可接入
  REGISTERED: 1,        // 已入库：档案登记完成，生成唯一SN，允许接入
  PLATFORM_CONNECTED: 2,// 已接入：平台接入完成，允许分配
  ASSIGNED: 3,          // 已分配：已绑定单位/项目/点位，允许业务配置
  MAINTENANCE: 4,       // 维护中：维保/维修中，暂停正常使用
  SCRAPPED: 5,          // 报废：已报废，禁止任何操作（终态）
} as const;

export type DeviceLifecycleStatusValue = (typeof DeviceLifecycleStatus)[keyof typeof DeviceLifecycleStatus];

export const DEVICE_LIFECYCLE_LABELS: Record<number, string> = {
  [DeviceLifecycleStatus.DRAFT]: '草稿/预登记',
  [DeviceLifecycleStatus.REGISTERED]: '已入库',
  [DeviceLifecycleStatus.PLATFORM_CONNECTED]: '已接入',
  [DeviceLifecycleStatus.ASSIGNED]: '已分配',
  [DeviceLifecycleStatus.MAINTENANCE]: '维护中',
  [DeviceLifecycleStatus.SCRAPPED]: '报废',
};

/** 可操作状态校验助手 */
export const DeviceLifecycleRules = {
  /** 是否允许接入平台：已入库/已接入/已分配设备均可重新配置接入 */
  canConnect: (status: number) =>
    status >= DeviceLifecycleStatus.REGISTERED &&
    status < DeviceLifecycleStatus.SCRAPPED &&
    status !== DeviceLifecycleStatus.MAINTENANCE,

  /** 是否允许分配单位：仅已接入设备 */
  canAllocate: (status: number) => status === DeviceLifecycleStatus.PLATFORM_CONNECTED,

  /** 是否允许业务配置：已接入/已分配/维护中 */
  canConfigure: (status: number) =>
    status >= DeviceLifecycleStatus.PLATFORM_CONNECTED && status < DeviceLifecycleStatus.SCRAPPED,

  /** 是否允许删除档案：仅草稿/已入库（未接入） */
  canDeleteArchive: (status: number) => status <= DeviceLifecycleStatus.REGISTERED,

  /** 是否允许报废：非报废状态 */
  canScrap: (status: number) => status !== DeviceLifecycleStatus.SCRAPPED,

  /** 是否允许维护：已分配的设备 */
  canMaintain: (status: number) => status === DeviceLifecycleStatus.ASSIGNED,

  /** 操作错误提示文案 */
  messages: {
    connect: '仅允许为「已入库/已接入/已分配」状态的设备配置平台接入（草稿/维护中/报废设备不可接入）',
    allocate: '仅允许为「已接入」状态的设备分配单位',
    configure: '设备尚未接入平台，请先完成「设备接入」',
    deleteArchive: '已接入或已分配的设备请先「移除接入」或「报废」，不可直接删除档案',
    scrap: '设备已报废',
  },
} as const;
