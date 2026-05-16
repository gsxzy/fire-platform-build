"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const video_controller_1 = require("@/controllers/video.controller");
const router = (0, express_1.Router)();
// 设备列表
router.get('/devices', video_controller_1.VideoController.list);
router.get('/devices/:deviceId/channels', video_controller_1.VideoController.channels);
// 流状态（ZLM）
router.get('/streams', video_controller_1.VideoController.streams);
router.get('/streams/:cameraId', video_controller_1.VideoController.streamStatus);
router.post('/stream/start/:cameraId', video_controller_1.VideoController.startStream);
router.post('/stream/stop/:cameraId', video_controller_1.VideoController.stopZLMStream);
// 取流核心接口
router.post('/stream', video_controller_1.VideoController.getPlayUrl);
router.get('/stream/:deviceId', video_controller_1.VideoController.getStream);
// 摄像头配置
router.get('/cameras', video_controller_1.VideoController.cameraConfigs);
// 停止播放
router.post('/stop', video_controller_1.VideoController.stopPlay);
// PTZ / 预设位
router.post('/ptz', video_controller_1.VideoController.ptzControl);
router.post('/ptz/:deviceId', video_controller_1.VideoController.ptzControl);
router.post('/preset', video_controller_1.VideoController.presetControl);
router.post('/preset/:deviceId', video_controller_1.VideoController.presetControl);
// 回放
router.post('/playback', video_controller_1.VideoController.getPlayback);
router.get('/playback/:deviceId', video_controller_1.VideoController.getPlayback);
// 截图
router.get('/snapshot/:deviceId/:channelId', video_controller_1.VideoController.snapshot);
router.get('/snapshot/:deviceId', video_controller_1.VideoController.snapshot);
// 实时预览
router.get('/live/:deviceId', video_controller_1.VideoController.livePreview);
exports.default = router;
//# sourceMappingURL=video.routes.js.map