export declare class DutyShiftService {
    static create(data: any): Promise<import("sequelize").Model<any, any>>;
    static list(keyword?: string, status?: number, pageNum?: number, pageSize?: number): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
    static byId(id: string): Promise<import("sequelize").Model<any, any> | null>;
    static update(id: string, data: any): Promise<[affectedCount: number]>;
    static delete(id: string): Promise<number>;
    static toggleStatus(id: string, status: number): Promise<[affectedCount: number]>;
}
//# sourceMappingURL=dutyShift.service.d.ts.map