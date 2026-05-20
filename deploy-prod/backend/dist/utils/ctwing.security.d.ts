import type { Request, Response } from 'express';
/** 签名验证（CTWing 消息加密）
 * 模式（通过 CTWING_VERIFY 环境变量控制）：
 *   none   → 平台无签名机制，仅依赖 IP 白名单做防护
 *   debug  → 尝试验签，无签名头时放行并记录
 *   strict → 强制验签，无签名头或验签失败均拒绝
 */
export declare function verifySignature(req: Request): boolean;
/** IoT 接口 IP 白名单校验 */
export declare function checkIotWhitelist(req: Request, res: Response): boolean;
//# sourceMappingURL=ctwing.security.d.ts.map