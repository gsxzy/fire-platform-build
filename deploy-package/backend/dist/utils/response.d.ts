/** 与前端 ApiResponse / getApiEnvelopeMessage 对齐的 JSON 信封 */
export interface ApiJsonEnvelope<T = unknown> {
    code: number;
    msg: string;
    /** 与 msg 同义，兼容只读 message 的前端类型 */
    message: string;
    data: T | null;
    timestamp: number;
    requestId?: string;
}
export declare const success: <T = unknown>(data: T, msg?: string, requestId?: string) => ApiJsonEnvelope<T>;
export declare const fail: (msg?: string, code?: number, requestId?: string) => ApiJsonEnvelope<null>;
export declare const page: (list: unknown[], total: number, pageNum: number, pageSize: number, requestId?: string) => ApiJsonEnvelope<{
    list: unknown[];
    total: number;
    pageNum: number;
    pageSize: number;
    pages: number;
}>;
//# sourceMappingURL=response.d.ts.map