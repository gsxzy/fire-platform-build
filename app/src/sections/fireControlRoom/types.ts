export interface FireAlarm {
  id: number; alarm_no: string; alarm_type: number; alarm_level: number;
  device_name: string; device_point?: string; device_code?: string;
  unit_name: string; location: string; alarm_desc: string;
  status: number; confirm_result?: number; confirm_remark?: string; created_at: string;
}
export interface FaultAlarm {
  id: number; alarm_no: string; device_name: string; device_type: string;
  location: string; fault_desc: string; status: number; created_at: string;
}
export interface ShieldItem {
  id: number; point_name: string; device_type: string; location: string;
  shield_reason: string; shield_time: string; status: number;
}
export interface FeedbackAlarm {
  id: number; device_name: string; location: string; feedback_desc: string; created_at: string;
}
export interface MultilinePoint {
  id: number; host_id: number; point_no: number; point_name: string;
  device_type: string; status: number; feedback_status: number; fault_status: number;
}
export interface BusPoint {
  id: number; host_id: number; loop_no: number; point_no: number;
  point_name: string; device_type: string; install_location: string; status: number;
}
export interface RealtimeData {
  pressure_1: number; pressure_2: number;
  liquid_level_1: number; liquid_level_2: number;
  video_status: number; host_status: number;
  current_mode: number; silenced: number;
  fire_count: number; fault_count: number;
  shield_count: number; feedback_count: number;
}
export interface CommandLog {
  id: number; command_type: string; command_value: string;
  point_name?: string; command_by: string; command_time: string; result: number;
}
export interface VideoCamera {
  id: string | number; cameraName: string; cameraNo: string;
  streamUrl: string; status: number; position: string;
}
