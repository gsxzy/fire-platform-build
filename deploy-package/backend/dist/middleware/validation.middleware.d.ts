/**
 * validation.middleware.ts — 通用请求数据校验中间件
 *
 * 提供链式声明式校验 API，自动格式化 400 错误响应。
 * 零外部依赖，基于原生逻辑实现。
 */
import { Request, Response, NextFunction } from 'express';
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}
export interface ValidatorConfig {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: (string | number)[];
    custom?: (value: unknown, body: Record<string, unknown>) => string | undefined | null;
    trim?: boolean;
    defaultValue?: unknown;
}
export declare class ValidatorChain {
    private config;
    optional(): this;
    isString(): this;
    isNumber(): this;
    isBoolean(): this;
    isArray(): this;
    isObject(): this;
    isEmail(): this;
    isUrl(): this;
    isDate(): this;
    min(val: number): this;
    max(val: number): this;
    minLength(val: number): this;
    maxLength(val: number): this;
    matches(regex: RegExp): this;
    isEnum(values: (string | number)[]): this;
    custom(fn: (value: unknown, body: Record<string, unknown>) => string | undefined | null): this;
    withDefault(value: unknown): this;
    trim(): this;
    build(): ValidatorConfig;
}
export declare function v(): ValidatorChain;
export interface ValidationSchema {
    [field: string]: ValidatorConfig;
}
export declare function validateBody(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateParams(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.middleware.d.ts.map