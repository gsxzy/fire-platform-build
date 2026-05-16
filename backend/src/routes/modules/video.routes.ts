import { Router } from 'express';
import { VideoController } from '@/controllers/video.controller';

const router = Router();

// 设备列表
router.get('/devices', VideoController.list);
router.get('/devices/:deviceId/channels', VideoController.channels);

// 流状态（ZLM）
router.get('/streams', VideoController.streams);
router.get('/streams/:cameraId', VideoController.streamStatus);
router.post('/stream/start/:cameraId', VideoController.startStream);
router.post('/stream/stop/:cameraId', VideoController.stopZLMStream);

// 取流核心接口
router.post('/stream', VideoController.getPlayUrl);
router.get('/stream/:deviceId', VideoController.getStream);

// 摄像头配置
router.get('/cameras', VideoController.cameraConfigs);

// 停止播放
router.post('/stop', VideoController.stopPlay);

// PTZ / 预设位
router.post('/ptz', VideoController.ptzControl);
router.post('/ptz/:deviceId', VideoController.ptzControl);
router.post('/preset', VideoController.presetControl);
router.post('/preset/:deviceId', VideoController.presetControl);

// 回放
router.post('/playback', VideoController.getPlayback);
router.get('/playback/:deviceId', VideoController.getPlayback);

// 截图
router.get('/snapshot/:deviceId/:channelId', VideoController.snapshot);
router.get('/snapshot/:deviceId', VideoController.snapshot);

// 实时预览
router.get('/live/:deviceId', VideoController.livePreview);

export default router;
