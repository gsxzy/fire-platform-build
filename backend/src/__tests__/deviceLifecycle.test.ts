import { describe, it, expect } from '../test-utils';
import { DeviceLifecycleStatus, DeviceLifecycleRules, DEVICE_LIFECYCLE_LABELS } from '@/constants/deviceLifecycle';

describe('DeviceLifecycle 状态机', () => {
  const S = DeviceLifecycleStatus;

  describe('状态常量定义', () => {
    it('应包含 6 个生命周期状态', () => {
      expect(Object.keys(S).length).toBe(6);
      expect(S.DRAFT).toBe(0);
      expect(S.REGISTERED).toBe(1);
      expect(S.PLATFORM_CONNECTED).toBe(2);
      expect(S.ASSIGNED).toBe(3);
      expect(S.MAINTENANCE).toBe(4);
      expect(S.SCRAPPED).toBe(5);
    });

    it('状态标签应与常量一一对应', () => {
      expect(DEVICE_LIFECYCLE_LABELS[S.DRAFT]).toBe('草稿/预登记');
      expect(DEVICE_LIFECYCLE_LABELS[S.REGISTERED]).toBe('已入库');
      expect(DEVICE_LIFECYCLE_LABELS[S.PLATFORM_CONNECTED]).toBe('已接入');
      expect(DEVICE_LIFECYCLE_LABELS[S.ASSIGNED]).toBe('已分配');
      expect(DEVICE_LIFECYCLE_LABELS[S.MAINTENANCE]).toBe('维护中');
      expect(DEVICE_LIFECYCLE_LABELS[S.SCRAPPED]).toBe('报废');
    });
  });

  describe('canConnect — 允许接入平台', () => {
    it('已入库/已接入/已分配 → true', () => {
      expect(DeviceLifecycleRules.canConnect(S.REGISTERED)).toBe(true);
      expect(DeviceLifecycleRules.canConnect(S.PLATFORM_CONNECTED)).toBe(true);
      expect(DeviceLifecycleRules.canConnect(S.ASSIGNED)).toBe(true);
    });

    it('草稿/维护中/报废 → false', () => {
      expect(DeviceLifecycleRules.canConnect(S.DRAFT)).toBe(false);
      expect(DeviceLifecycleRules.canConnect(S.MAINTENANCE)).toBe(false);
      expect(DeviceLifecycleRules.canConnect(S.SCRAPPED)).toBe(false);
    });
  });

  describe('canAllocate — 允许分配单位', () => {
    it('仅已接入 → true', () => {
      expect(DeviceLifecycleRules.canAllocate(S.PLATFORM_CONNECTED)).toBe(true);
    });

    it('其他状态 → false', () => {
      expect(DeviceLifecycleRules.canAllocate(S.DRAFT)).toBe(false);
      expect(DeviceLifecycleRules.canAllocate(S.REGISTERED)).toBe(false);
      expect(DeviceLifecycleRules.canAllocate(S.ASSIGNED)).toBe(false);
      expect(DeviceLifecycleRules.canAllocate(S.MAINTENANCE)).toBe(false);
      expect(DeviceLifecycleRules.canAllocate(S.SCRAPPED)).toBe(false);
    });
  });

  describe('canConfigure — 允许业务配置', () => {
    it('已接入/已分配/维护中 → true', () => {
      expect(DeviceLifecycleRules.canConfigure(S.PLATFORM_CONNECTED)).toBe(true);
      expect(DeviceLifecycleRules.canConfigure(S.ASSIGNED)).toBe(true);
      expect(DeviceLifecycleRules.canConfigure(S.MAINTENANCE)).toBe(true);
    });

    it('草稿/已入库/报废 → false', () => {
      expect(DeviceLifecycleRules.canConfigure(S.DRAFT)).toBe(false);
      expect(DeviceLifecycleRules.canConfigure(S.REGISTERED)).toBe(false);
      expect(DeviceLifecycleRules.canConfigure(S.SCRAPPED)).toBe(false);
    });
  });

  describe('canDeleteArchive — 允许删除档案', () => {
    it('草稿/已入库 → true', () => {
      expect(DeviceLifecycleRules.canDeleteArchive(S.DRAFT)).toBe(true);
      expect(DeviceLifecycleRules.canDeleteArchive(S.REGISTERED)).toBe(true);
    });

    it('已接入及以上 → false', () => {
      expect(DeviceLifecycleRules.canDeleteArchive(S.PLATFORM_CONNECTED)).toBe(false);
      expect(DeviceLifecycleRules.canDeleteArchive(S.ASSIGNED)).toBe(false);
      expect(DeviceLifecycleRules.canDeleteArchive(S.MAINTENANCE)).toBe(false);
      expect(DeviceLifecycleRules.canDeleteArchive(S.SCRAPPED)).toBe(false);
    });
  });

  describe('canScrap — 允许报废', () => {
    it('非报废状态 → true', () => {
      expect(DeviceLifecycleRules.canScrap(S.DRAFT)).toBe(true);
      expect(DeviceLifecycleRules.canScrap(S.REGISTERED)).toBe(true);
      expect(DeviceLifecycleRules.canScrap(S.PLATFORM_CONNECTED)).toBe(true);
      expect(DeviceLifecycleRules.canScrap(S.ASSIGNED)).toBe(true);
      expect(DeviceLifecycleRules.canScrap(S.MAINTENANCE)).toBe(true);
    });

    it('报废状态 → false', () => {
      expect(DeviceLifecycleRules.canScrap(S.SCRAPPED)).toBe(false);
    });
  });

  describe('canMaintain — 允许维护', () => {
    it('仅已分配 → true', () => {
      expect(DeviceLifecycleRules.canMaintain(S.ASSIGNED)).toBe(true);
    });

    it('其他状态 → false', () => {
      expect(DeviceLifecycleRules.canMaintain(S.DRAFT)).toBe(false);
      expect(DeviceLifecycleRules.canMaintain(S.REGISTERED)).toBe(false);
      expect(DeviceLifecycleRules.canMaintain(S.PLATFORM_CONNECTED)).toBe(false);
      expect(DeviceLifecycleRules.canMaintain(S.MAINTENANCE)).toBe(false);
      expect(DeviceLifecycleRules.canMaintain(S.SCRAPPED)).toBe(false);
    });
  });

  describe('核心流程闭环', () => {
    it('标准正向流程：草稿 → 入库 → 接入 → 分配 → 维护 → 报废', () => {
      let status = S.DRAFT;
      // 入库
      status = S.REGISTERED;
      expect(DeviceLifecycleRules.canConnect(status)).toBe(true);
      // 接入
      status = S.PLATFORM_CONNECTED;
      expect(DeviceLifecycleRules.canAllocate(status)).toBe(true);
      // 分配
      status = S.ASSIGNED;
      expect(DeviceLifecycleRules.canMaintain(status)).toBe(true);
      // 维护
      status = S.MAINTENANCE;
      expect(DeviceLifecycleRules.canScrap(status)).toBe(true);
      // 报废（终态）
      status = S.SCRAPPED;
      expect(DeviceLifecycleRules.canScrap(status)).toBe(false);
      expect(DeviceLifecycleRules.canConnect(status)).toBe(false);
      expect(DeviceLifecycleRules.canAllocate(status)).toBe(false);
      expect(DeviceLifecycleRules.canConfigure(status)).toBe(false);
    });
  });
});
