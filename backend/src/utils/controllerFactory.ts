import type { Request, Response } from 'express';
import type { Model, ModelStatic, WhereOptions, FindOptions } from 'sequelize';
import { sendSuccess, sendDeleted, sendPage } from './response';
import { parseIdStrict, sanitizeBody } from './validator';

export interface CrudListOptions<_M extends Model> {
  whereBuilder?: (req: Request) => WhereOptions;
  order?: [string, string][];
  include?: FindOptions['include'];
}

export interface CrudCreateOptions {
  bodyMapper?: (body: Record<string, unknown>) => Record<string, unknown>;
  defaults?: (req: Request) => Record<string, unknown>;
}

export interface CrudUpdateOptions {
  bodyMapper?: (body: Record<string, unknown>) => Record<string, unknown>;
}

function parsePagination(req: Request) {
  const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
  return { pageNum, pageSize };
}

/** 生成标准列表处理器 */
export function makeListHandler<M extends Model>(
  model: ModelStatic<M>,
  options: CrudListOptions<M> = {}
) {
  return async (req: Request, res: Response) => {
    const { pageNum, pageSize } = parsePagination(req);
    const where = options.whereBuilder ? options.whereBuilder(req) : {};
    const { count, rows } = await model.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: options.order,
      include: options.include,
    } as any);
    sendPage(res, req, rows, count, pageNum, pageSize);
  };
}

/** 生成标准创建处理器 */
export function makeCreateHandler<M extends Model>(
  model: ModelStatic<M>,
  options: CrudCreateOptions = {}
) {
  return async (req: Request, res: Response) => {
    const body = options.bodyMapper
      ? options.bodyMapper(req.body as Record<string, unknown>)
      : sanitizeBody(req.body);
    const defaults = options.defaults ? options.defaults(req) : {};
    const instance = await model.create({ ...body, ...defaults } as any);
    sendSuccess(res, req, { id: (instance as any).id }, '创建成功');
  };
}

/** 生成标准更新处理器 */
export function makeUpdateHandler<M extends Model>(
  model: ModelStatic<M>,
  options: CrudUpdateOptions = {}
) {
  return async (req: Request, res: Response) => {
    const body = options.bodyMapper
      ? options.bodyMapper(req.body as Record<string, unknown>)
      : sanitizeBody(req.body);
    await model.update(body, { where: { id: parseIdStrict(req.params.id) } } as any);
    sendSuccess(res, req, null, '更新成功');
  };
}

/** 生成标准删除处理器 */
export function makeDeleteHandler<M extends Model>(model: ModelStatic<M>) {
  return async (req: Request, res: Response) => {
    await model.destroy({ where: { id: parseIdStrict(req.params.id) } } as any);
    sendDeleted(res, req);
  };
}

/** 生成标准详情处理器 */
export function makeDetailHandler<M extends Model>(model: ModelStatic<M>) {
  return async (req: Request, res: Response) => {
    const instance = await model.findByPk(req.params.id);
    sendSuccess(res, req, instance || null);
  };
}
