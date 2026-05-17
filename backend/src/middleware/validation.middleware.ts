/**
 * validation.middleware.ts — 通用请求数据校验中间件
 *
 * 提供链式声明式校验 API，自动格式化 400 错误响应。
 * 零外部依赖，基于原生逻辑实现。
 */

import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

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

export class ValidatorChain {
  private config: ValidatorConfig = {};

  optional(): this {
    this.config.required = false;
    return this;
  }

  isString(): this {
    this.config.type = 'string';
    return this;
  }

  isNumber(): this {
    this.config.type = 'number';
    return this;
  }

  isBoolean(): this {
    this.config.type = 'boolean';
    return this;
  }

  isArray(): this {
    this.config.type = 'array';
    return this;
  }

  isObject(): this {
    this.config.type = 'object';
    return this;
  }

  isEmail(): this {
    this.config.type = 'email';
    return this;
  }

  isUrl(): this {
    this.config.type = 'url';
    return this;
  }

  isDate(): this {
    this.config.type = 'date';
    return this;
  }

  min(val: number): this {
    this.config.min = val;
    return this;
  }

  max(val: number): this {
    this.config.max = val;
    return this;
  }

  minLength(val: number): this {
    this.config.minLength = val;
    return this;
  }

  maxLength(val: number): this {
    this.config.maxLength = val;
    return this;
  }

  matches(regex: RegExp): this {
    this.config.pattern = regex;
    return this;
  }

  isEnum(values: (string | number)[]): this {
    this.config.enum = values;
    return this;
  }

  custom(fn: (value: unknown, body: Record<string, unknown>) => string | undefined | null): this {
    this.config.custom = fn;
    return this;
  }

  withDefault(value: unknown): this {
    this.config.defaultValue = value;
    return this;
  }

  trim(): this {
    this.config.trim = true;
    return this;
  }

  build(): ValidatorConfig {
    return { ...this.config };
  }
}

export function v(): ValidatorChain {
  return new ValidatorChain();
}

function validateValue(
  field: string,
  value: unknown,
  config: ValidatorConfig,
  body: Record<string, unknown>
): ValidationError | null {
  // Default value
  if (value === undefined && config.defaultValue !== undefined) {
    return null; // default applied at caller
  }

  // Required check
  if (config.required !== false && (value === undefined || value === null || value === '')) {
    return { field, message: `${field} 不能为空`, value };
  }

  if (value === undefined || value === null) {
    return null;
  }

  let processedValue = value;

  // Trim strings
  if (config.trim && typeof processedValue === 'string') {
    processedValue = processedValue.trim();
  }

  // Type checks
  switch (config.type) {
    case 'string':
      if (typeof processedValue !== 'string') {
        return { field, message: `${field} 必须是字符串`, value: processedValue };
      }
      break;
    case 'number': {
      const num = Number(processedValue);
      if (isNaN(num)) {
        return { field, message: `${field} 必须是数字`, value: processedValue };
      }
      processedValue = num;
      break;
    }
    case 'boolean':
      if (typeof processedValue !== 'boolean') {
        return { field, message: `${field} 必须是布尔值`, value: processedValue };
      }
      break;
    case 'array':
      if (!Array.isArray(processedValue)) {
        return { field, message: `${field} 必须是数组`, value: processedValue };
      }
      break;
    case 'object':
      if (typeof processedValue !== 'object' || Array.isArray(processedValue) || processedValue === null) {
        return { field, message: `${field} 必须是对象`, value: processedValue };
      }
      break;
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof processedValue !== 'string' || !emailRegex.test(processedValue)) {
        return { field, message: `${field} 必须是有效的邮箱地址`, value: processedValue };
      }
      break;
    }
    case 'url': {
      const urlRegex = /^https?:\/\/.+/;
      if (typeof processedValue !== 'string' || !urlRegex.test(processedValue)) {
        return { field, message: `${field} 必须是有效的 URL`, value: processedValue };
      }
      break;
    }
    case 'date': {
      const date = new Date(processedValue as string | number);
      if (isNaN(date.getTime())) {
        return { field, message: `${field} 必须是有效的日期`, value: processedValue };
      }
      break;
    }
  }

  // String length checks
  if (typeof processedValue === 'string') {
    if (config.minLength !== undefined && processedValue.length < config.minLength) {
      return { field, message: `${field} 长度不能少于 ${config.minLength} 个字符`, value: processedValue };
    }
    if (config.maxLength !== undefined && processedValue.length > config.maxLength) {
      return { field, message: `${field} 长度不能超过 ${config.maxLength} 个字符`, value: processedValue };
    }
  }

  // Number range checks
  if (typeof processedValue === 'number') {
    if (config.min !== undefined && processedValue < config.min) {
      return { field, message: `${field} 不能小于 ${config.min}`, value: processedValue };
    }
    if (config.max !== undefined && processedValue > config.max) {
      return { field, message: `${field} 不能大于 ${config.max}`, value: processedValue };
    }
  }

  // Array length checks
  if (Array.isArray(processedValue)) {
    if (config.minLength !== undefined && processedValue.length < config.minLength) {
      return { field, message: `${field} 长度不能少于 ${config.minLength} 项`, value: processedValue };
    }
    if (config.maxLength !== undefined && processedValue.length > config.maxLength) {
      return { field, message: `${field} 长度不能超过 ${config.maxLength} 项`, value: processedValue };
    }
  }

  // Pattern check
  if (config.pattern && typeof processedValue === 'string' && !config.pattern.test(processedValue)) {
    return { field, message: `${field} 格式不正确`, value: processedValue };
  }

  // Enum check
  if (config.enum && !config.enum.includes(processedValue as string | number)) {
    return { field, message: `${field} 必须是以下值之一: ${config.enum.join(', ')}`, value: processedValue };
  }

  // Custom validator
  if (config.custom) {
    const customError = config.custom(processedValue, body);
    if (customError) {
      return { field, message: customError, value: processedValue };
    }
  }

  return null;
}

export interface ValidationSchema {
  [field: string]: ValidatorConfig;
}

export function validateBody(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const body = req.body as Record<string, unknown>;

    for (const [field, config] of Object.entries(schema)) {
      const value = body[field];

      // Apply default value
      if (value === undefined && config.defaultValue !== undefined) {
        body[field] = config.defaultValue;
        continue;
      }

      const error = validateValue(field, value, config, body);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      res.status(400).json(fail('请求参数校验失败', 400, (req as any).reqId));
      return;
    }

    next();
  };
}

export function validateQuery(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const query = req.query as Record<string, unknown>;

    for (const [field, config] of Object.entries(schema)) {
      const value = query[field];

      if (value === undefined && config.defaultValue !== undefined) {
        query[field] = config.defaultValue as any;
        continue;
      }

      const error = validateValue(field, value, config, query);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      res.status(400).json(fail('查询参数校验失败', 400, (req as any).reqId));
      return;
    }

    next();
  };
}

export function validateParams(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const params = req.params as Record<string, unknown>;

    for (const [field, config] of Object.entries(schema)) {
      const value = params[field];
      const error = validateValue(field, value, config, params);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      res.status(400).json(fail('路径参数校验失败', 400, (req as any).reqId));
      return;
    }

    next();
  };
}
