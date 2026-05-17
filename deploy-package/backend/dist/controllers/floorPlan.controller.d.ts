import type { Request, Response } from 'express';
export declare const FloorPlanController: {
    buildingList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    buildingCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    buildingUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    buildingDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    buildingGet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    floorList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    floorCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    floorUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    floorDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    floorGet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    uploadPlan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFloorDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addDevicePosition(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    batchAddDevicePositions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteDevicePosition(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCameraBindings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    addCameraBinding(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUnmarkedDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=floorPlan.controller.d.ts.map