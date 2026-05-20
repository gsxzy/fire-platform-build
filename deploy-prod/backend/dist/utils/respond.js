"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPage = exports.sendFail = exports.sendSuccess = void 0;
/**
 * @deprecated 请直接从 `@/utils/response` 导入 sendSuccess / sendFail / sendPage
 * 本文件保留为兼容入口，将在下个大版本移除
 */
var response_1 = require("@/utils/response");
Object.defineProperty(exports, "sendSuccess", { enumerable: true, get: function () { return response_1.sendSuccess; } });
Object.defineProperty(exports, "sendFail", { enumerable: true, get: function () { return response_1.sendFail; } });
Object.defineProperty(exports, "sendPage", { enumerable: true, get: function () { return response_1.sendPage; } });
//# sourceMappingURL=respond.js.map