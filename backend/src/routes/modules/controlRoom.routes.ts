import { Router } from 'express';
import { ControlRoomController } from '@/controllers/controlRoom.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';
import { upload } from '@/middleware/upload';

const router = Router();
const h = (name: keyof typeof ControlRoomController) =>
  handleController(`ControlRoom.${String(name)}`, ControlRoomController[name]);

const view = requirePermission('monitor:view');
const control = requirePermission('monitor:control');

router.get('/', view, h('list'));
router.post('/', control, h('create'));

router.get('/hosts', view, h('hostList'));
router.post('/hosts', control, h('hostCreate'));
router.put('/hosts/:id', control, h('hostUpdate'));
router.delete('/hosts/:id', control, h('hostDelete'));
router.get('/hosts/:id', view, h('hostDetail'));

router.post('/silence', control, h('silence'));
router.post('/reset', control, h('reset'));
router.post('/mode', control, h('switchMode'));
router.post('/multiline/control', control, h('controlMultiline'));

router.get('/multiline', view, h('multilineList'));
router.post('/multiline', control, h('multilineCreate'));
router.put('/multiline/:id', control, h('multilineUpdate'));
router.get('/bus-points', view, h('busPointList'));
router.post('/bus-points', control, h('busPointCreate'));
router.put('/bus-points/:id', control, h('busPointUpdate'));

router.get('/command-logs', view, h('commandLogs'));
router.get('/videos', view, h('videoList'));
router.get('/video-candidates', view, h('videoCandidates'));
router.post('/video-link', control, h('videoLink'));
router.post('/video-unlink', control, h('videoUnlink'));

router.get('/host-device-codes', view, h('hostDeviceCodeList'));
router.post('/host-device-codes', control, h('hostDeviceCodeCreate'));
router.put('/host-device-codes/:id', control, h('hostDeviceCodeUpdate'));
router.delete('/host-device-codes/:id', control, h('hostDeviceCodeDelete'));
router.post('/host-device-codes/import', control, upload.single('file'), h('hostDeviceCodeImport'));

router.put('/:id', control, h('update'));
router.delete('/:id', control, h('delete'));
router.get('/:id', view, h('detail'));

export default router;
