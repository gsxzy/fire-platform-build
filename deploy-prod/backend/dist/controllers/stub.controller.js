"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub Controller - 兼容旧版前端路径的兜底控制器
 * 本文件为 facade 层，实际逻辑已拆分到 service：
 *   - stub.oldTable.service.ts  （旧表 SQL 查询）
 *   - stub.fakeData.service.ts  （假数据/无真实实现接口）
 * ═══════════════════════════════════════════════════════════════════
 */
__exportStar(require("@/services/stub.oldTable.service"), exports);
__exportStar(require("@/services/stub.fakeData.service"), exports);
//# sourceMappingURL=stub.controller.js.map