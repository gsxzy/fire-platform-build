export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface LoginData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userInfo: UserInfo;
}

export interface UserInfo {
  userId: number;
  username: string;
  realName: string;
  avatar: string | null;
  roles: string[];
  permissions: string[];
}

export interface User {
  id: number;
  username: string;
  real_name: string;
  phone: string | null;
  email: string | null;
  user_type: number;
  status: number;
  org_id: number | null;
  last_login_time: string | null;
  create_time: string;
}

export interface Role {
  id: number;
  role_code: string;
  role_name: string;
  role_type: number;
  description: string | null;
}

export interface Menu {
  id: number;
  menu_name: string;
  parent_id: number;
  order_num: number;
  path: string | null;
  component: string | null;
  menu_type: number;
  visible: number;
  status: number;
  perms: string | null;
  icon: string | null;
}

export interface Org {
  id: number;
  org_name: string;
  parent_id: number;
  org_code: string | null;
  org_type: number;
  leader: string | null;
  phone: string | null;
  status: number;
  longitude: number | null;
  latitude: number | null;
  address: string | null;
}

export interface DeviceType {
  id: number;
  type_code: string;
  type_name: string;
  category: number;
  icon: string | null;
  is_controllable: number;
  is_monitorable: number;
  status: number;
}

export interface Device {
  id: number;
  device_code: string;
  device_name: string;
  device_type_id: number;
  parent_id: number | null;
  org_id: number;
  building_id: number | null;
  building_name: string | null;
  floor: string | null;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  status: number;
  control_status: number;
  last_online_time: string | null;
  device_type_name?: string;
}

export interface FireAlarm {
  id: number;
  event_code: string;
  device_id: number;
  device_code: string | null;
  device_name: string | null;
  device_type_id: number | null;
  org_id: number;
  building_name: string | null;
  location: string | null;
  alarm_time: string;
  alarm_type: number | null;
  alarm_level: number;
  alarm_value: string | null;
  confirm_time: string | null;
  confirm_user: string | null;
  confirm_result: number | null;
  process_time: string | null;
  process_result: number | null;
  close_time: string | null;
  duration: number | null;
  linkage_count: number;
  video_url: string | null;
}

export interface FaultAlarm {
  id: number;
  event_code: string;
  device_id: number;
  device_code: string | null;
  device_name: string | null;
  location: string | null;
  fault_time: string;
  fault_type: number | null;
  fault_code: string | null;
  fault_desc: string | null;
  recovery_time: string | null;
  handle_status: number;
  handle_user: string | null;
  handle_time: string | null;
}

export interface FeedbackAlarm {
  id: number;
  event_code: string;
  device_id: number;
  device_name: string | null;
  location: string | null;
  feedback_time: string;
  feedback_type: number | null;
  feedback_value: string | null;
  handle_status: number;
}

export interface ControlCommand {
  id: number;
  command_code: string;
  command_type: number;
  device_id: number | null;
  device_name: string | null;
  command_value: string | null;
  command_time: string;
  command_user: string | null;
  command_status: number;
  response_result: string | null;
}

export interface ShieldRecord {
  id: number;
  shield_code: string;
  device_id: number;
  device_name: string | null;
  shield_type: number;
  shield_reason: string;
  shield_start: string;
  shield_end: string | null;
  shield_duration: number | null;
  shield_user: string | null;
  unshield_time: string | null;
  unshield_user: string | null;
  status: number;
  auto_unshield: number;
}

export interface MultilinePanel {
  id: number;
  panel_code: string;
  panel_name: string | null;
  device_id: number;
  panel_type: number;
  total_points: number | null;
  status: number;
}

export interface MultilinePoint {
  id: number;
  panel_id: number;
  point_code: string;
  point_name: string | null;
  device_id: number | null;
  address: number;
  point_type: number;
  control_mode: number;
  status: number;
  linked_device_name?: string | null;
}

export interface BusPanel {
  id: number;
  panel_code: string;
  panel_name: string | null;
  device_id: number;
  loop_no: number | null;
  total_points: number | null;
  page_size: number;
  status: number;
}

export interface BusPoint {
  id: number;
  panel_id: number;
  point_code: string;
  point_name: string | null;
  device_id: number | null;
  loop_no: number | null;
  address: number;
  point_type: number | null;
  status: number;
  linked_device_name?: string | null;
}

export interface LinkageRule {
  id: number;
  rule_code: string;
  rule_name: string;
  rule_type: number;
  trigger_condition: string;
  linkage_action: string;
  effective_time: string | null;
  priority: number;
  status: number;
  org_id: number | null;
  description: string | null;
  trigger_count: number;
}

export interface LinkageRecord {
  id: number;
  record_code: string;
  rule_id: number | null;
  rule_name: string | null;
  alarm_event_code: string | null;
  alarm_device_name: string | null;
  alarm_location: string | null;
  linkage_time: string;
  action_type: number;
  action_status: number;
  action_time: string | null;
  ai_result: string | null;
  camera_name: string | null;
}

export interface AIConfig {
  id: number;
  config_type: number;
  config_name: string;
  sensitivity: number;
  threshold: number | null;
  min_duration: number;
  max_detection: number;
  whitelist_configs: string | null;
  model_version: string | null;
  status: number;
  event_count: number;
}

export interface Unit {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_type: number;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  longitude: number | null;
  latitude: number | null;
  build_area: number | null;
  build_count: number | null;
  risk_level: number;
  status: number;
  access_status: number;
  device_count: number;
  online_count: number;
  alarm_count: number;
  firechief_name: string | null;
  firechief_phone: string | null;
}

export interface Building {
  id: number;
  building_code: string;
  building_name: string;
  unit_id: number;
  building_type: number | null;
  floor_count: number | null;
  underfloor_count: number | null;
  building_height: number | null;
}

export interface PatrolPlan {
  id: number;
  plan_code: string;
  plan_name: string;
  plan_type: number;
  patrol_content: string | null;
  cycle_type: number;
  status: number;
}

export interface PatrolTask {
  id: number;
  task_code: string;
  plan_id: number | null;
  task_name: string | null;
  executor_name: string | null;
  plan_date: string;
  status: number;
  completed_count: number;
  total_count: number;
  abnormal_count: number;
  result: number | null;
}

export interface Hazard {
  id: number;
  hazard_code: string;
  device_name: string | null;
  hazard_type: number;
  hazard_level: number;
  hazard_desc: string;
  hazard_location: string | null;
  discover_time: string;
  discover_user: string | null;
  status: number;
  rect_result: string | null;
  rect_user: string | null;
  check_result: number | null;
}

export interface Preplan {
  id: number;
  preplan_code: string;
  preplan_name: string;
  preplan_type: number;
  level: number;
  org_name: string | null;
  version: string | null;
  status: number;
  applicable_scene: string | null;
}

export interface Camera {
  id: number;
  camera_code: string;
  camera_name: string;
  camera_type: number;
  location: string | null;
  status: number;
  is_recording: number;
}

export interface DashboardStats {
  totalUnits: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  onlineRate: number;
  totalFireAlarms: number;
  totalFaultAlarms: number;
  todayFireAlarms: number;
  todayFaultAlarms: number;
  totalHazards: number;
  unresolvedHazards: number;
  patrolCompletion: number;
  deviceTypes: Array<{ name: string; count: number }>;
  alarmTrend: Array<{ date: string; fire: number; fault: number }>;
  unitAlarmStats: Array<{ name: string; fire: number; fault: number }>;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

export interface MonitorOverview {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  onlineRate: number;
  pendingFire: number;
  pendingFault: number;
  shieldCount: number;
  totalCameras: number;
  onlineCameras: number;
  totalUnits: number;
  todayAlarms: number;
  weekAlarms: number;
  multilinePoints: number;
  busPoints: number;
}

export interface AlarmStatistics {
  fireTotal: number;
  firePending: number;
  faultTotal: number;
  faultPending: number;
  feedbackTotal: number;
  todayFire: number;
  todayFault: number;
  todayFeedback: number;
}
