import { useState, useEffect, useRef, useCallback } from 'react';
import { alarmService, controlRoomService } from '@/api/services';
import { getStream } from '@/api/videoService';
import { useToast } from '@/core/ToastContext';
import { generateProcess, generateDutyRecords, getStatusInfo, getAlarmTypeInfo } from './utils';

export function useAlarmDetail(alarm: any, controlRoomId?: string | number) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'duty' | 'handle'>('duty');
  const [confirmType, setConfirmType] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { error: showError } = useToast();

  /* ── fetch detail ── */
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alarmService.getDetail(String(alarm.id));
      if (res.code === 200 && res.data) {
        setConfirmType('');
        setRemark('');

        // 合并摄像头：消控室关联摄像头优先置顶
        let mergedCameras = res.data.relatedCameras || [];
        if (controlRoomId) {
          try {
            const roomRes: any = await controlRoomService.getVideos(controlRoomId);
            const roomCams = Array.isArray(roomRes)
              ? roomRes
              : (roomRes?.list || roomRes?.data || []);
            if (roomCams.length > 0) {
              const seen = new Set<string | number>();
              mergedCameras = [];
              for (const cam of [...roomCams, ...(res.data.relatedCameras || [])]) {
                const key = cam.deviceId || cam.id || cam.cameraNo;
                if (key && !seen.has(key)) {
                  seen.add(key);
                  mergedCameras.push(cam);
                }
              }
            }
          } catch {
            // 消控室摄像头获取失败不影响主流程
          }
        }

        setDetail({ ...res.data, relatedCameras: mergedCameras });

        if (mergedCameras.length > 0) {
          const cam = mergedCameras[0];
          if (cam.deviceId && cam.channelId) {
            loadVideoStream(cam.deviceId, cam.channelId);
          }
        }
      } else {
        showError('加载失败', res.msg || '无法获取告警详情');
      }
    } catch (e: any) {
      showError('加载告警详情失败', e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, [alarm.id, controlRoomId, showError]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  /* ── video stream ── */
  const loadVideoStream = async (deviceId: string, channelId: string) => {
    setVideoLoading(true);
    try {
      const stream = await getStream(deviceId, channelId);
      const url = stream.streamUrl || stream.flv || stream.hls || stream.wsFlv || '';
      setVideoUrl(url);
    } catch (e: any) {
      console.error('[Video] 加载视频流失败:', e.message);
    } finally {
      setVideoLoading(false);
    }
  };

  /* ── phone call ── */
  const handleCall = (phone: string) => {
    if (!phone || phone === '-') return;
    window.location.href = `tel:${phone}`;
  };

  /* ── recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (e: any) {
      showError('无法启动录音', '请检查浏览器麦克风权限');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const playRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audio.play();
  };

  /* ── submit handler ── */
  const handleSubmit = async () => {
    if (!confirmType) {
      showError('请确认警情类型', '真实火警/误报/测试/维保测试 至少选择一项');
      return;
    }
    try {
      await alarmService.confirm(String(alarm.id), '当前用户', remark, confirmType);
      showError('提交成功', '警情确认已提交');
    } catch (e: any) {
      showError('提交失败', e.message);
    }
  };

  /* ── derived data ── */
  const processSteps = detail ? generateProcess(detail.status) : [];
  const dutyRecords = detail ? generateDutyRecords(detail) : [];
  const statusInfo = detail ? getStatusInfo(detail.status) : getStatusInfo('new');
  const typeInfo = detail ? getAlarmTypeInfo(detail.alarm_type || detail.type) : getAlarmTypeInfo('unknown');
  const TypeIcon = typeInfo.icon;

  const unitName = detail?.unit_name || detail?.unit?.unit_name || '未知单位';
  const alarmTime = detail?.createdAt || '-';
  const location = detail?.location || '-';
  const controlRoom = detail?.controlRoom;
  const floorPlan = detail?.floorPlan;
  const cameras = detail?.relatedCameras || [];
  const dutyPhone = controlRoom?.duty_phone || '-';
  const crManager = controlRoom?.duty_person || '-';
  const crManagerPhone = controlRoom?.duty_phone || '-';

  return {
    detail, loading,
    activeTab, setActiveTab,
    confirmType, setConfirmType,
    remark, setRemark,
    videoUrl, videoLoading, videoPlaying, setVideoPlaying,
    recording, recordedBlob,
    showFloorPlan, setShowFloorPlan,
    videoRef,
    handleCall,
    startRecording, stopRecording, playRecording,
    handleSubmit,
    processSteps, dutyRecords,
    statusInfo, typeInfo, TypeIcon,
    unitName, alarmTime, location,
    controlRoom, floorPlan, cameras,
    dutyPhone, crManager, crManagerPhone,
  };
}
