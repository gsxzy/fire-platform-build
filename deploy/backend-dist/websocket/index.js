"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
const websocket_service_1 = require("./websocket.service");
function initWebSocket(server) {
    websocket_service_1.WebSocketService.init(server);
    return websocket_service_1.WebSocketService.getWss();
}
//# sourceMappingURL=index.js.map