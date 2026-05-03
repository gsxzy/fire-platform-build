/**
 * ═══════════════════════════════════════════════════════════════════
 * 模块引擎 - 核心模块注册、加载、开关管理
 * ═══════════════════════════════════════════════════════════════════
 */
import { MODULES } from './ModuleRegistry';
import { MessageBus, TOPICS } from './MessageBus';
import type { PlatformModule, ModuleStatus } from './types';

const STORAGE_KEY = 'platform_module_status';

class ModuleEngineCore {
  private moduleStatus: Map<string, ModuleStatus> = new Map();
  private listeners: Set<(id: string, status: ModuleStatus) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /* ── 获取所有模块 ── */
  getAllModules(): PlatformModule[] {
    return MODULES.map(m => ({
      ...m,
      status: this.moduleStatus.get(m.id) || m.status,
    }));
  }

  /* ── 获取启用的模块 ── */
  getEnabledModules(): PlatformModule[] {
    return this.getAllModules().filter(m => m.status === 'enabled');
  }

  /* ── 获取有菜单的启用模块 ── */
  getMenuModules(): PlatformModule[] {
    return this.getEnabledModules().filter(m => !!m.menu);
  }

  /* ── 获取单个模块 ── */
  getModule(id: string): PlatformModule | undefined {
    const base = MODULES.find(m => m.id === id);
    if (!base) return undefined;
    return { ...base, status: this.moduleStatus.get(id) || base.status };
  }

  /* ── 检查模块是否启用 ── */
  isEnabled(id: string): boolean {
    return (this.moduleStatus.get(id) || 'enabled') === 'enabled';
  }

  /* ── 启用模块 ── */
  enable(id: string): void {
    const mod = MODULES.find(m => m.id === id);
    if (!mod) return;

    // 检查依赖
    if (mod.dependsOn) {
      for (const depId of mod.dependsOn) {
        if (!this.isEnabled(depId)) {
          console.warn(`[ModuleEngine] Cannot enable ${id}: dependency ${depId} is disabled`);
          return;
        }
      }
    }

    this.moduleStatus.set(id, 'enabled');
    this.saveToStorage();
    this.notifyListeners(id, 'enabled');
    MessageBus.publish(TOPICS.MODULE_ENABLED, { moduleId: id }, 'ModuleEngine');
    MessageBus.publish(TOPICS.MODULE_STATUS_CHANGED, { moduleId: id, status: 'enabled' }, 'ModuleEngine');
  }

  /* ── 禁用模块 ── */
  disable(id: string): void {
    // 检查是否有其他模块依赖此模块
    const dependents = MODULES.filter(m =>
      m.dependsOn?.includes(id) && this.isEnabled(m.id)
    );
    if (dependents.length > 0) {
      console.warn(`[ModuleEngine] Cannot disable ${id}: dependents [${dependents.map(d => d.id).join(', ')}] are still enabled`);
      return;
    }

    this.moduleStatus.set(id, 'disabled');
    this.saveToStorage();
    this.notifyListeners(id, 'disabled');
    MessageBus.publish(TOPICS.MODULE_DISABLED, { moduleId: id }, 'ModuleEngine');
    MessageBus.publish(TOPICS.MODULE_STATUS_CHANGED, { moduleId: id, status: 'disabled' }, 'ModuleEngine');
  }

  /* ── 切换模块状态 ── */
  toggle(id: string): void {
    if (this.isEnabled(id)) this.disable(id);
    else this.enable(id);
  }

  /* ── 重置为默认 ── */
  reset(): void {
    this.moduleStatus.clear();
    localStorage.removeItem(STORAGE_KEY);
    MODULES.forEach(m => {
      this.notifyListeners(m.id, m.status);
    });
  }

  /* ── 获取路由 ── */
  getEnabledRoutes(): { path: string; moduleId: string }[] {
    const routes: { path: string; moduleId: string }[] = [];
    this.getEnabledModules().forEach(mod => {
      if (mod.menu) {
        routes.push({ path: mod.menu.path, moduleId: mod.id });
        mod.menu.children?.forEach(child => {
          routes.push({ path: child.path, moduleId: mod.id });
        });
      }
      // 也添加模块根路径
      routes.push({ path: mod.path, moduleId: mod.id });
    });
    return routes;
  }

  /* ── 订阅状态变更 ── */
  subscribe(listener: (id: string, status: ModuleStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /* ── 获取统计 ── */
  getStats() {
    const all = this.getAllModules();
    return {
      total: all.length,
      enabled: all.filter(m => m.status === 'enabled').length,
      disabled: all.filter(m => m.status === 'disabled').length,
      error: all.filter(m => m.status === 'error').length,
    };
  }

  /* ── 私有方法 ── */
  private notifyListeners(id: string, status: ModuleStatus): void {
    this.listeners.forEach(fn => fn(id, status));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, ModuleStatus>;
        Object.entries(parsed).forEach(([k, v]) => this.moduleStatus.set(k, v));
      }
    } catch { /* ignore */ }
  }

  private saveToStorage(): void {
    const obj: Record<string, ModuleStatus> = {};
    this.moduleStatus.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
}

export const ModuleEngine = new ModuleEngineCore();
