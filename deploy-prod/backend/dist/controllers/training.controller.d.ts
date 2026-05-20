import type { Request, Response } from 'express';
export declare const TrainingController: {
    courseList(req: Request, res: Response): Promise<void>;
    courseCreate(req: Request, res: Response): Promise<void>;
    courseUpdate(req: Request, res: Response): Promise<void>;
    courseDelete(req: Request, res: Response): Promise<void>;
    examList(req: Request, res: Response): Promise<void>;
    examById(req: Request, res: Response): Promise<void>;
    examCreate(req: Request, res: Response): Promise<void>;
    /** 提交答案并计算成绩 */
    examSubmit(req: Request, res: Response): Promise<void>;
    recordList(req: Request, res: Response): Promise<void>;
    recordById(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=training.controller.d.ts.map