import type { Request, Response } from 'express';
export declare const VideoController: {
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    channels(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    streams(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    streamStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    startStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopZLMStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPlayUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cameraConfigs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopPlay(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    ptzControl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    presetControl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPlayback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    snapshot(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    livePreview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=video.controller.d.ts.map