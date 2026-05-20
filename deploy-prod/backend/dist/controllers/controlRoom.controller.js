"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlRoomController = void 0;
const room = __importStar(require("./controlRoom/room"));
const host = __importStar(require("./controlRoom/host"));
const point = __importStar(require("./controlRoom/point"));
const code = __importStar(require("./controlRoom/code"));
exports.ControlRoomController = {
    list: room.list,
    create: room.create,
    update: room.update,
    delete: room.remove,
    detail: room.detail,
    videoList: room.videoList,
    hostList: host.hostList,
    hostCreate: host.hostCreate,
    hostUpdate: host.hostUpdate,
    hostDelete: host.hostDelete,
    hostDetail: host.hostDetail,
    silence: host.silence,
    reset: host.reset,
    switchMode: host.switchMode,
    controlMultiline: host.controlMultiline,
    multilineList: point.multilineList,
    multilineCreate: point.multilineCreate,
    multilineUpdate: point.multilineUpdate,
    busPointList: point.busPointList,
    busPointCreate: point.busPointCreate,
    busPointUpdate: point.busPointUpdate,
    commandLogs: point.commandLogs,
    hostDeviceCodeList: code.hostDeviceCodeList,
    hostDeviceCodeCreate: code.hostDeviceCodeCreate,
    hostDeviceCodeUpdate: code.hostDeviceCodeUpdate,
    hostDeviceCodeDelete: code.hostDeviceCodeDelete,
    hostDeviceCodeImport: code.hostDeviceCodeImport,
};
//# sourceMappingURL=controlRoom.controller.js.map