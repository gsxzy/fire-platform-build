"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("@/config/database"));
require("@/models");
async function sync() {
    try {
        await database_1.default.authenticate();
        console.log('[DB] Connected');
        await database_1.default.sync({ force: process.argv.includes('--force') });
        console.log('[DB] All tables synchronized');
        process.exit(0);
    }
    catch (err) {
        console.error('[DB] Sync error:', err.message);
        process.exit(1);
    }
}
sync();
//# sourceMappingURL=syncDb.js.map