/**
 * 可预期的 HTTP 业务错误 —— 抛给全局错误中间件统一输出信封
 */
export declare class HttpError extends Error {
    readonly httpStatus: number;
    readonly businessCode: number;
    constructor(message: string, httpStatus?: number, businessCode?: number);
}
//# sourceMappingURL=httpError.d.ts.map