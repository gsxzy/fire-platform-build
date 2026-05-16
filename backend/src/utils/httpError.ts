/**
 * 可预期的 HTTP 业务错误 —— 抛给全局错误中间件统一输出信封
 */
export class HttpError extends Error {
  readonly httpStatus: number;
  readonly businessCode: number;

  constructor(message: string, httpStatus = 400, businessCode?: number) {
    super(message);
    this.name = 'HttpError';
    this.httpStatus = httpStatus;
    this.businessCode = businessCode ?? httpStatus;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
