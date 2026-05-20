import type { Request, Response } from 'express';
export declare function hostList(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function hostCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function hostUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function hostDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function hostDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function silence(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function reset(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function switchMode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function controlMultiline(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=host.d.ts.map