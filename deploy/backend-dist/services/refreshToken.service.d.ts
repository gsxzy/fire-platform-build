export declare function ensureRefreshTokenTable(): Promise<void>;
export declare function generateRefreshToken(): string;
export declare function storeRefreshToken(token: string, userId: string | number, username: string, roles: unknown): Promise<void>;
export declare function getRefreshTokenData(token: string): Promise<{
    userId: string;
    username: string;
    roles: unknown;
} | null>;
export declare function revokeRefreshToken(token: string): Promise<void>;
export declare function revokeAllUserRefreshTokens(userId: string | number): Promise<void>;
//# sourceMappingURL=refreshToken.service.d.ts.map