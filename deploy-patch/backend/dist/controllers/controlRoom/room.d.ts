import type { Request, Response } from 'express';
export declare function list(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function update(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function remove(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function detail(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function videoList(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/** 查询可关联的视频设备候选列表 */
export declare function videoCandidates(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/** 关联摄像头到消控室 */
export declare function videoLink(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/** 解关联摄像头 */
export declare function videoUnlink(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/** 消控室物联实时数据 */
export declare function realtime(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/** 消控室屏蔽记录 */
export declare function shields(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=room.d.ts.map