export interface TodoListQuery {
    status?: number;
    userId?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
}
export declare class WorkbenchTodoService {
    static list(q: TodoListQuery): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    static create(body: any): Promise<import("sequelize").Model<any, any>>;
    static update(id: number, body: any): Promise<import("sequelize").Model<any, any>>;
    static delete(id: number): Promise<import("sequelize").Model<any, any>>;
    static byId(id: number): Promise<import("sequelize").Model<any, any> | null>;
    static countPending(userId?: string): Promise<number>;
}
export interface NoticeListQuery {
    type?: string;
    status?: number;
    keyword?: string;
    page?: number;
    pageSize?: number;
}
export declare class WorkbenchNoticeService {
    static list(q: NoticeListQuery): Promise<{
        list: import("sequelize").Model<any, any>[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    static create(body: any): Promise<import("sequelize").Model<any, any>>;
    static update(id: number, body: any): Promise<import("sequelize").Model<any, any>>;
    static delete(id: number): Promise<import("sequelize").Model<any, any>>;
    static byId(id: number): Promise<import("sequelize").Model<any, any> | null>;
}
//# sourceMappingURL=workbench.service.d.ts.map