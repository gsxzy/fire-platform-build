import type { Request, Response } from 'express';
import crypto from 'crypto';
import logger from '@/config/logger';
import { fail } from '@/utils/response';

const CTWING_API_KEY = process.env.CTWING_API_KEY || '';

/** 签名验证（CTWing 消息加密）
 * 模式（通过 CTWING_VERIFY 环境变量控制）：
 *   none   → 平台无签名机制，仅依赖 IP 白名单做防护
 *   debug  → 尝试验签，无签名头时放行并记录
 *   strict → 强制验签，无签名头或验签失败均拒绝
 */
export function verifySignature(req: Request): boolean {
  const verifyMode = (process.env.CTWING_VERIFY || 'none').toLowerCase();

  if (verifyMode === 'none' || !CTWING_API_KEY) {
    if (!CTWING_API_KEY && verifyMode !== 'none') {
      logger.info('[CTWing] CTWING_API_KEY 未配置，验签已跳过（建议设置 CTWING_VERIFY=none 并配置 IOT_IP_WHITELIST）');
    }
    return true;
  }

  const signature = req.headers['ctwing-signature'] as string
    ?? req.headers['x-ctwing-signature'] as string
    ?? req.headers['signature'] as string
    ?? req.headers['x-signature'] as string
    ?? '';

  if (!signature) {
    if (verifyMode === 'strict') {
      logger.error(
        '[CTWing] 请求缺少签名头（strict模式已拒绝）。' +
        '如确认CTWing HTTP推送无签名，请将 CTWING_VERIFY 改为 none 并启用 IOT_IP_WHITELIST'
      );
      return false;
    }
    logger.debug('[CTWing] 请求无签名头，放行（debug模式）');
    return true;
  }

  const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
  const signContent = sortedBody + '&key=' + CTWING_API_KEY;
  const expectedMd5 = crypto.createHash('md5').update(signContent).digest('hex').toUpperCase();

  const bodyStr = JSON.stringify(req.body);
  const expectedMd5Legacy = crypto.createHash('md5').update(CTWING_API_KEY + bodyStr).digest('hex');
  const expectedMd5Reverse = crypto.createHash('md5').update(bodyStr + CTWING_API_KEY).digest('hex');
  const expectedHmac = crypto.createHmac('sha1', CTWING_API_KEY).update(bodyStr).digest('hex');

  const sigUpper = signature.toUpperCase();
  const isValid = sigUpper === expectedMd5
    || sigUpper === expectedMd5Legacy.toUpperCase()
    || sigUpper === expectedMd5Reverse.toUpperCase();

  if (isValid) return true;

  const detail = `[CTWing] 签名不匹配 ` +
    `sig=${signature.substring(0, 32)}… ` +
    `md5_doc=${expectedMd5} ` +
    `md5_key+body=${expectedMd5Legacy} ` +
    `md5_body+key=${expectedMd5Reverse} ` +
    `hmac_sha1=${expectedHmac} ` +
    `body=${bodyStr.substring(0, 200)}…`;

  if (verifyMode === 'strict') {
    logger.error(`${detail}，已拒绝`);
    return false;
  }

  logger.warn(`${detail}，放行（debug模式）`);
  return true;
}

/** IoT 接口 IP 白名单校验 */
export function checkIotWhitelist(req: Request, res: Response): boolean {
  const whitelist = process.env.IOT_IP_WHITELIST;
  if (!whitelist) return true;
  const allowed = whitelist.split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '');
  if (!allowed.includes(clientIp)) {
    res.status(403).json(fail('来源IP不在白名单中', 403));
    return false;
  }
  return true;
}
