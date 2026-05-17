import { Router } from 'express';
import { IoTController } from '@/controllers/iot.controller';
import { IoTProtocolController } from '@/controllers/iotProtocol.controller';
import { Hikvision4GController } from '@/controllers/hikvision4g.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();

const iot = (name: keyof typeof IoTController) =>
  handleController(`IoT.${String(name)}`, IoTController[name]);
const proto = (name: keyof typeof IoTProtocolController) =>
  handleController(`IoTProtocol.${String(name)}`, IoTProtocolController[name]);

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

export default router;
