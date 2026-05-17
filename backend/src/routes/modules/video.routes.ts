import { Router } from 'express';
import { VideoController } from '@/controllers/video.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof VideoController) =>
  handleController(`Video.${String(name)}`, VideoController[name]);

const view = requirePermission('monitor:view');
const control = requirePermission('monitor:control');

router.get('/devices', view, h('list'));
router.get('/devices/:deviceId/channels', view, h('channels'));

router.get('/streams', view, h('streams'));
router.get('/streams/:cameraId', view, h('streamStatus'));
router.post('/stream/start/:cameraId', control, h('startStream'));
router.post('/stream/stop/:cameraId', control, h('stopZLMStream'));

router.post('/stream', view, h('getPlayUrl'));
router.get('/stream/:deviceId', view, h('getStream'));

router.get('/cameras', view, h('cameraConfigs'));

router.post('/stop', control, h('stopPlay'));

router.post('/ptz', control, h('ptzControl'));
router.post('/ptz/:deviceId', control, h('ptzControl'));
router.post('/preset', control, h('presetControl'));
router.post('/preset/:deviceId', control, h('presetControl'));

router.post('/playback', view, h('getPlayback'));
router.get('/playback/:deviceId', view, h('getPlayback'));

router.get('/snapshot/:deviceId/:channelId', view, h('snapshot'));
router.get('/snapshot/:deviceId', view, h('snapshot'));

router.get('/live/:deviceId', view, h('livePreview'));

export default router;
