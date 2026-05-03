/**
 * ═══════════════════════════════════════════════════════════════════
 * 平台底座 - 统一导出
 * ═══════════════════════════════════════════════════════════════════
 */
export * from './types';
export { MessageBus, bus, TOPICS } from './MessageBus';
export { ModuleEngine } from './ModuleEngine';
export { MODULES, registerExtensionModule } from './ModuleRegistry';
export type { PlatformModule, ModuleMenu, ModuleMenuChild, ModuleStatus, ModuleCategory, ModulePermission, BusMessage, MessageHandler, PlatformConfig } from './types';
