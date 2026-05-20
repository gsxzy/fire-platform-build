import * as room from './controlRoom/room';
import * as host from './controlRoom/host';
import * as point from './controlRoom/point';
import * as code from './controlRoom/code';

export const ControlRoomController = {
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
