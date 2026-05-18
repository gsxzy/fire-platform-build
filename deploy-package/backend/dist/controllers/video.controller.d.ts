import type { Request, Response } from 'express';
export declare const VideoController: {
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    channels(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    streams(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    streamStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    startStream(req: Request, res: Response): Promise<void>;
    stopZLMStream(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getPlayUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    cameraConfigs(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    stopPlay(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    ptzControl(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    presetControl(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getPlayback(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    snapshot(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    livePreview(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getStream(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=video.controller.d.ts.map