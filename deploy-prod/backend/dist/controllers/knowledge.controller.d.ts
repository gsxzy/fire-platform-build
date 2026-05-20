import type { Request, Response } from 'express';
export declare const KnowledgeController: {
    list(req: Request, res: Response): Promise<void>;
    byId(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    categories(req: Request, res: Response): Promise<void>;
    categoryList(req: Request, res: Response): Promise<void>;
    categoryCreate(req: Request, res: Response): Promise<void>;
    categoryUpdate(req: Request, res: Response): Promise<void>;
    categoryDelete(req: Request, res: Response): Promise<void>;
    upload(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=knowledge.controller.d.ts.map