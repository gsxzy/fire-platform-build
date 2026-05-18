"use strict";
/**
 * validation.middleware.ts — 通用请求数据校验中间件
 *
 * 提供链式声明式校验 API，自动格式化 400 错误响应。
 * 零外部依赖，基于原生逻辑实现。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorChain = void 0;
exports.v = v;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const response_1 = require("../utils/response");
class ValidatorChain {
    config = {};
    optional() {
        this.config.required = false;
        return this;
    }
    isString() {
        this.config.type = 'string';
        return this;
    }
    isNumber() {
        this.config.type = 'number';
        return this;
    }
    isBoolean() {
        this.config.type = 'boolean';
        return this;
    }
    isArray() {
        this.config.type = 'array';
        return this;
    }
    isObject() {
        this.config.type = 'object';
        return this;
    }
    isEmail() {
        this.config.type = 'email';
        return this;
    }
    isUrl() {
        this.config.type = 'url';
        return this;
    }
    isDate() {
        this.config.type = 'date';
        return this;
    }
    min(val) {
        this.config.min = val;
        return this;
    }
    max(val) {
        this.config.max = val;
        return this;
    }
    minLength(val) {
        this.config.minLength = val;
        return this;
    }
    maxLength(val) {
        this.config.maxLength = val;
        return this;
    }
    matches(regex) {
        this.config.pattern = regex;
        return this;
    }
    isEnum(values) {
        this.config.enum = values;
        return this;
    }
    custom(fn) {
        this.config.custom = fn;
        return this;
    }
    withDefault(value) {
        this.config.defaultValue = value;
        return this;
    }
    trim() {
        this.config.trim = true;
        return this;
    }
    build() {
        return { ...this.config };
    }
}
exports.ValidatorChain = ValidatorChain;
function v() {
    return new ValidatorChain();
}
function validateValue(field, value, config, body) {
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
            const date = new Date(processedValue);
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
    if (config.enum && !config.enum.includes(processedValue)) {
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
function validateBody(schema) {
    return (req, res, next) => {
        const errors = [];
        const body = req.body;
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
            res.status(400).json((0, response_1.fail)('请求参数校验失败', 400, req.reqId));
            return;
        }
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const errors = [];
        const query = req.query;
        for (const [field, config] of Object.entries(schema)) {
            const value = query[field];
            if (value === undefined && config.defaultValue !== undefined) {
                query[field] = config.defaultValue;
                continue;
            }
            const error = validateValue(field, value, config, query);
            if (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            res.status(400).json((0, response_1.fail)('查询参数校验失败', 400, req.reqId));
            return;
        }
        next();
    };
}
function validateParams(schema) {
    return (req, res, next) => {
        const errors = [];
        const params = req.params;
        for (const [field, config] of Object.entries(schema)) {
            const value = params[field];
            const error = validateValue(field, value, config, params);
            if (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            res.status(400).json((0, response_1.fail)('路径参数校验失败', 400, req.reqId));
            return;
        }
        next();
    };
}
//# sourceMappingURL=validation.middleware.js.map