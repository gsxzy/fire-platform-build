import { Router } from 'express';
import { IoTController } from '@/controllers/iot.controller';
import { IoTProtocolController } from '@/controllers/iotProtocol.controller';
import { GB28181Controller } from '@/controllers/gb28181.controller';
import { Hikvision4GController } from '@/controllers/hikvision4g.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();

const iot = (name: keyof typeof IoTController) =>
  handleController(`IoT.${String(name)}`, IoTController[name]);
const proto = (name: keyof typeof IoTProtocolController) =>
  handleController(`IoTProtocol.${String(name)}`, IoTProtocolController[name]);
const gb = (name: keyof typeof GB28181Controller) =>
  handleController(`GB28181.${String(name)}`, GB28181Controller[name]);

const view = requirePermission('iot:view');
const manage = requirePermission('iot:manage');

router.get('/devices', view, iot('deviceList'));
router.get('/devices/list', view, iot('deviceList'));
router.post('/devices', manage, iot('deviceCreate'));
router.put('/devices/:id', manage, iot('deviceUpdate'));
router.delete('/devices/:id', manage, iot('deviceDelete'));

router.get('/protocols', view, iot('protocolList'));
router.post('/protocols', manage, iot('protocolCreate'));
router.put('/protocols/:id', manage, iot('protocolUpdate'));
router.delete('/protocols/:id', manage, iot('protocolDelete'));

router.get('/pipelines', view, iot('pipelineList'));
router.post('/pipelines', manage, iot('pipelineCreate'));
router.put('/pipelines/:id', manage, iot('pipelineUpdate'));

router.post('/modbus/read', manage, proto('readModbus'));
router.post('/snmp/read', manage, proto('readSNMP'));
router.post('/control', manage, proto('sendControl'));
router.post('/batch-read', manage, proto('batchRead'));
router.post('/mqtt/parse', manage, proto('parseMQTT'));

router.get('/hikvision/devices/:sn/data', view, Hikvision4GController.getDeviceData);
router.post('/hikvision/batch-data', view, Hikvision4GController.batchDeviceData);

/* ── GB28181 国标设备（非 WVP 模式 fallback）── */
router.get('/gb28181-devices', view, gb('list'));
router.get('/gb28181-devices/:id', view, gb('byId'));
router.post('/gb28181-devices', manage, gb('create'));
router.put('/gb28181-devices/:id', manage, gb('update'));
router.delete('/gb28181-devices/:id', manage, gb('delete'));

export default router;
