import type { Request, Response, NextFunction } from 'express';
/**
 * 校验当前用户是否具备任一权限码；超级管理员角色直接放行
 */
export declare function requirePermission(...permCodes: string[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=permission.d.ts.map