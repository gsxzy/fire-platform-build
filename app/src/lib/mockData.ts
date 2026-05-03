// Mock data for demo mode (no backend required)
export const mockUsers = [
  { id: 1, username: 'admin', real_name: '系统管理员', phone: '13800138000', email: 'admin@fire.com', user_type: 3, status: 1, org_id: 1, last_login_time: '2025-04-19 14:30:00', create_time: '2025-01-01' },
  { id: 2, username: 'operator', real_name: '值班操作员', phone: '13800138001', email: 'op@fire.com', user_type: 1, status: 1, org_id: 1, last_login_time: '2025-04-19 13:00:00', create_time: '2025-01-01' },
  { id: 3, username: 'manager', real_name: '消防主管', phone: '13800138002', email: 'mgr@fire.com', user_type: 2, status: 1, org_id: 1, last_login_time: '2025-04-19 12:00:00', create_time: '2025-01-01' },
];

export const mockRoles = [
  { id: 1, role_code: 'SUPER_ADMIN', role_name: '超级管理员', role_type: 1, description: '全部权限' },
  { id: 2, role_code: 'ADMIN', role_name: '管理员', role_type: 1, description: '管理权限' },
  { id: 3, role_code: 'OPERATOR', role_name: '操作员', role_type: 1, description: '操作权限' },
];

export const mockOrgs = [
  { id: 1, org_name: '新致远智慧消防平台', parent_id: 0, org_code: 'ROOT', org_type: 1, leader: '张总', phone: '028-88888888', status: 1, address: '成都市高新区' },
  { id: 2, org_name: '锦江区消防大队', parent_id: 1, org_code: 'JJQ', org_type: 2, leader: '李队长', phone: '028-88888889', status: 1, address: '锦江区' },
  { id: 3, org_name: '武侯区消防大队', parent_id: 1, org_code: 'WHQ', org_type: 2, leader: '王队长', phone: '028-88888890', status: 1, address: '武侯区' },
];

export const mockDeviceTypes = [
  { id: 1, type_code: 'SMOKE_DETECTOR', type_name: '感烟探测器', category: 1, icon: 'flame', is_controllable: 0, is_monitorable: 1, status: 1 },
  { id: 2, type_code: 'HEAT_DETECTOR', type_name: '感温探测器', category: 1, icon: 'thermometer', is_controllable: 0, is_monitorable: 1, status: 1 },
  { id: 3, type_code: 'MANUAL_ALARM', type_name: '手动报警按钮', category: 1, icon: 'hand', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 4, type_code: 'FIRE_HOST', type_name: '火灾报警控制器', category: 1, icon: 'server', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 5, type_code: 'LINKAGE_HOST', type_name: '消防联动控制器', category: 4, icon: 'network', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 6, type_code: 'PRESSURE_SENSOR', type_name: '压力传感器', category: 2, icon: 'gauge', is_controllable: 0, is_monitorable: 1, status: 1 },
  { id: 7, type_code: 'LEVEL_SENSOR', type_name: '液位传感器', category: 2, icon: 'waves', is_controllable: 0, is_monitorable: 1, status: 1 },
  { id: 8, type_code: 'FIRE_PUMP', type_name: '消防水泵', category: 2, icon: 'pump', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 9, type_code: 'SMOKE_EXHAUST', type_name: '排烟风机', category: 3, icon: 'fan', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 10, type_code: 'FIRE_DOOR', type_name: '防火门', category: 4, icon: 'door-open', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 11, type_code: 'ROLLER_SHUTTER', type_name: '防火卷帘', category: 4, icon: 'panel-top', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 12, type_code: 'FIRE_DAMPER', type_name: '防火阀', category: 3, icon: 'wind', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 13, type_code: 'BROADCAST', type_name: '消防广播', category: 4, icon: 'volume-2', is_controllable: 1, is_monitorable: 1, status: 1 },
  { id: 14, type_code: 'CAMERA_AI', type_name: 'AI摄像头', category: 5, icon: 'video', is_controllable: 0, is_monitorable: 1, status: 1 },
  { id: 15, type_code: 'CAMERA_NORMAL', type_name: '普通摄像头', category: 5, icon: 'camera', is_controllable: 0, is_monitorable: 1, status: 1 },
];

export const mockDevices = [
  { id: 1, device_code: 'HOST-001', device_name: '1#火灾报警控制器', device_type_id: 4, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B1', location: '消防控制室', manufacturer: '海湾安全', model: 'GST-5000H', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '火灾报警控制器' },
  { id: 2, device_code: 'HOST-002', device_name: '2#火灾报警控制器', device_type_id: 4, parent_id: null, org_id: 1, building_id: 2, building_name: '2号楼', floor: 'F1', location: '消防控制室', manufacturer: '海湾安全', model: 'GST-5000H', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '火灾报警控制器' },
  { id: 3, device_code: 'SMOKE-001', device_name: '1号楼3层感烟探测器', device_type_id: 1, parent_id: 1, org_id: 1, building_id: 1, building_name: '1号楼', floor: '3F', location: '301室', manufacturer: '海湾安全', model: 'JTY-GD-G3', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '感烟探测器' },
  { id: 4, device_code: 'SMOKE-002', device_name: '1号楼5层感烟探测器', device_type_id: 1, parent_id: 1, org_id: 1, building_id: 1, building_name: '1号楼', floor: '5F', location: '走廊东侧', manufacturer: '海湾安全', model: 'JTY-GD-G3', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '感烟探测器' },
  { id: 5, device_code: 'HEAT-001', device_name: '地下车库感温探测器', device_type_id: 2, parent_id: 1, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B2', location: '停车位A区', manufacturer: '海湾安全', model: 'JTW-ZD-G3N', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '感温探测器' },
  { id: 6, device_code: 'MANUAL-001', device_name: '1号楼1层手动报警按钮', device_type_id: 3, parent_id: 1, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'F1', location: '大厅东侧', manufacturer: '海湾安全', model: 'J-SAP-M-GST', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '手动报警按钮' },
  { id: 7, device_code: 'PUMP-001', device_name: '1#消防泵', device_type_id: 8, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B1', location: '消防泵房', manufacturer: '南方泵业', model: 'XBD8.0/30', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '消防水泵' },
  { id: 8, device_code: 'PUMP-002', device_name: '2#喷淋泵', device_type_id: 8, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B1', location: '消防泵房', manufacturer: '南方泵业', model: 'XBD8.0/30', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '消防水泵' },
  { id: 9, device_code: 'FAN-001', device_name: '1#排烟风机', device_type_id: 9, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'F1', location: '风机房', manufacturer: '上虞风机', model: 'HTF-I-10', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '排烟风机' },
  { id: 10, device_code: 'PRESSURE-001', device_name: '高区主管压力传感器', device_type_id: 6, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B1', location: '消防泵房出口', manufacturer: '西门子', model: 'SITRANS P', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '压力传感器' },
  { id: 11, device_code: 'PRESSURE-002', device_name: '低区主管压力传感器', device_type_id: 6, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B1', location: '消防泵房出口', manufacturer: '西门子', model: 'SITRANS P', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '压力传感器' },
  { id: 12, device_code: 'LEVEL-001', device_name: '消防水池液位传感器', device_type_id: 7, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B2', location: '消防水池', manufacturer: 'E+H', model: 'FMR10', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '液位传感器' },
  { id: 13, device_code: 'CAMERA-001', device_name: '大厅摄像头', device_type_id: 15, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'F1', location: '大厅', manufacturer: '海康威视', model: 'DS-2CD2347G2-LU', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '普通摄像头' },
  { id: 14, device_code: 'CAMERA-002', device_name: '3层走廊摄像头', device_type_id: 15, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: '3F', location: '走廊', manufacturer: '海康威视', model: 'DS-2CD2347G2-LU', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '普通摄像头' },
  { id: 15, device_code: 'CAMERA-003', device_name: '地下车库摄像头', device_type_id: 15, parent_id: null, org_id: 1, building_id: 1, building_name: '1号楼', floor: 'B2', location: 'A区', manufacturer: '海康威视', model: 'DS-2CD2347G2-LU', status: 1, control_status: 0, last_online_time: '2025-04-19 14:00:00', device_type_name: '普通摄像头' },
];

export const mockFireAlarms = [
  { id: 1, event_code: 'FIRE-20250419001', device_id: 3, device_code: 'SMOKE-001', device_name: '1号楼3层感烟探测器', device_type_id: 1, org_id: 1, building_name: '1号楼', location: '301室', alarm_time: '2025-04-19 10:23:15', alarm_type: 1, alarm_level: 3, alarm_value: '0.18dB/m', confirm_time: null, confirm_user: null, confirm_result: null, process_time: null, process_result: null, close_time: null, duration: null, linkage_count: 0, video_url: null },
  { id: 2, event_code: 'FIRE-20250419002', device_id: 4, device_code: 'SMOKE-002', device_name: '1号楼5层感烟探测器', device_type_id: 1, org_id: 1, building_name: '1号楼', location: '走廊东侧', alarm_time: '2025-04-19 09:45:32', alarm_type: 1, alarm_level: 2, alarm_value: '0.25dB/m', confirm_time: '2025-04-19 09:50:10', confirm_user: 'admin', confirm_result: 1, process_time: '2025-04-19 10:00:00', process_result: 1, close_time: null, duration: 15, linkage_count: 1, video_url: null },
  { id: 3, event_code: 'FIRE-20250419003', device_id: 5, device_code: 'HEAT-001', device_name: '地下车库感温探测器', device_type_id: 2, org_id: 1, building_name: '地下车库', location: 'B2-A区', alarm_time: '2025-04-19 08:12:08', alarm_type: 1, alarm_level: 3, alarm_value: '58°C', confirm_time: null, confirm_user: null, confirm_result: null, process_time: null, process_result: null, close_time: null, duration: null, linkage_count: 0, video_url: null },
];

export const mockFaultAlarms = [
  { id: 1, event_code: 'FAULT-20250419001', device_id: 3, device_code: 'SMOKE-001', device_name: '1号楼3层感烟探测器', org_id: 1, location: '301室', fault_time: '2025-04-19 10:15:22', fault_type: 3, fault_code: 'E003', fault_desc: '传感器污染', recovery_time: null, duration: null, handle_status: 0, handle_user_id: null, handle_user: null, handle_time: null, handle_remark: null },
  { id: 2, event_code: 'FAULT-20250419002', device_id: 7, device_code: 'PUMP-001', device_name: '1#消防泵', org_id: 1, location: '消防泵房', fault_time: '2025-04-19 09:30:45', fault_type: 4, fault_code: 'E012', fault_desc: '电源模块异常', recovery_time: null, duration: null, handle_status: 1, handle_user_id: 2, handle_user: 'operator', handle_time: '2025-04-19 10:00:00', handle_remark: '已更换电源模块' },
  { id: 3, event_code: 'FAULT-20250419003', device_id: 1, device_code: 'HOST-001', device_name: '1#火灾报警控制器', org_id: 1, location: '消防控制室', fault_time: '2025-04-19 07:55:10', fault_type: 2, fault_code: 'E001', fault_desc: '通信线路干扰', recovery_time: null, duration: null, handle_status: 0, handle_user_id: null, handle_user: null, handle_time: null, handle_remark: null },
];

export const mockFeedbackAlarms = [
  { id: 1, event_code: 'FB-20250419001', device_id: 7, device_code: 'PUMP-001', device_name: '1#消防泵', org_id: 1, location: '消防泵房', feedback_time: '2025-04-19 09:46:00', feedback_type: 1, feedback_value: '启动反馈', source_event_code: 'FIRE-20250419002', handle_status: 0, handle_user_id: null, handle_time: null, handle_remark: null },
  { id: 2, event_code: 'FB-20250419002', device_id: 9, device_code: 'FAN-001', device_name: '1#排烟风机', org_id: 1, location: '风机房', feedback_time: '2025-04-19 09:47:30', feedback_type: 2, feedback_value: '运行反馈', source_event_code: 'FIRE-20250419002', handle_status: 0, handle_user_id: null, handle_time: null, handle_remark: null },
];

export const mockUnits = [
  { id: 1, unit_code: 'UNIT-001', unit_name: '成都万达广场', unit_type: 1, province: '四川省', city: '成都市', district: '锦江区', address: '锦华路一段68号', longitude: 104.083, latitude: 30.657, build_area: 450000, build_count: 8, floor_count: 30, risk_level: 3, status: 1, access_status: 1, device_count: 156, online_count: 148, alarm_count: 12, firechief_name: '李经理', firechief_phone: '13800138010' },
  { id: 2, unit_code: 'UNIT-002', unit_name: '成都国际金融中心', unit_type: 1, province: '四川省', city: '成都市', district: '锦江区', address: '红星路三段1号', longitude: 104.078, latitude: 30.656, build_area: 320000, build_count: 5, floor_count: 25, risk_level: 3, status: 1, access_status: 1, device_count: 98, online_count: 95, alarm_count: 8, firechief_name: '王经理', firechief_phone: '13800138012' },
  { id: 3, unit_code: 'UNIT-003', unit_name: '成都太古里', unit_type: 1, province: '四川省', city: '成都市', district: '锦江区', address: '中纱帽街8号', longitude: 104.076, latitude: 30.654, build_area: 210000, build_count: 12, floor_count: 15, risk_level: 2, status: 1, access_status: 1, device_count: 72, online_count: 70, alarm_count: 5, firechief_name: '陈经理', firechief_phone: '13800138014' },
  { id: 4, unit_code: 'UNIT-004', unit_name: '天府软件园A区', unit_type: 2, province: '四川省', city: '成都市', district: '武侯区', address: '天府大道南段', longitude: 104.045, latitude: 30.542, build_area: 180000, build_count: 6, floor_count: 22, risk_level: 2, status: 1, access_status: 1, device_count: 64, online_count: 62, alarm_count: 3, firechief_name: '周经理', firechief_phone: '13800138016' },
  { id: 5, unit_code: 'UNIT-005', unit_name: '四川大学华西医院', unit_type: 1, province: '四川省', city: '成都市', district: '武侯区', address: '国学巷37号', longitude: 104.055, latitude: 30.645, build_area: 560000, build_count: 15, floor_count: 42, risk_level: 3, status: 1, access_status: 1, device_count: 320, online_count: 310, alarm_count: 25, firechief_name: '郑院长', firechief_phone: '13800138018' },
];

export const mockCameras = [
  { id: 1, camera_code: 'CAM-001', camera_name: '消控室摄像头', camera_type: 3, location: '消防控制室', status: 1, is_recording: 0 },
  { id: 2, camera_code: 'CAM-002', camera_name: '1F大厅摄像头', camera_type: 2, location: '一层大厅', status: 1, is_recording: 0 },
  { id: 3, camera_code: 'CAM-003', camera_name: '地下车库A区摄像头', camera_type: 2, location: 'B2层A区', status: 1, is_recording: 0 },
  { id: 4, camera_code: 'CAM-004', camera_name: '3F走廊摄像头', camera_type: 2, location: '3层走廊', status: 1, is_recording: 0 },
  { id: 5, camera_code: 'CAM-005', camera_name: '消防泵房摄像头', camera_type: 2, location: 'B1泵房', status: 1, is_recording: 0 },
  { id: 6, camera_code: 'CAM-006', camera_name: '屋顶水箱摄像头', camera_type: 1, location: '屋顶', status: 1, is_recording: 0 },
  { id: 7, camera_code: 'CAM-007', camera_name: '2F办公区摄像头', camera_type: 2, location: '2层办公区', status: 1, is_recording: 0 },
  { id: 8, camera_code: 'CAM-008', camera_name: 'B1配电房摄像头', camera_type: 2, location: 'B1配电房', status: 1, is_recording: 0 },
];

export const mockMultilinePanels = [
  { id: 1, panel_code: 'ML-001', panel_name: '1#多线盘', device_id: 1, panel_type: 1, total_points: 8, status: 1 },
];

export const mockMultilinePoints = [
  { id: 1, panel_id: 1, point_code: 'ML-001-01', point_name: '1#消防泵', device_id: 7, address: 1, point_type: 2, control_mode: 1, status: 0, linked_device_name: '1#消防泵' },
  { id: 2, panel_id: 1, point_code: 'ML-001-02', point_name: '2#喷淋泵', device_id: 8, address: 2, point_type: 2, control_mode: 1, status: 1, linked_device_name: '2#喷淋泵' },
  { id: 3, panel_id: 1, point_code: 'ML-001-03', point_name: '1#排烟风机', device_id: 9, address: 3, point_type: 2, control_mode: 1, status: 0, linked_device_name: '1#排烟风机' },
  { id: 4, panel_id: 1, point_code: 'ML-001-04', point_name: '消防电梯', device_id: null, address: 4, point_type: 2, control_mode: 1, status: 0, linked_device_name: null },
  { id: 5, panel_id: 1, point_code: 'ML-001-05', point_name: '正压送风机', device_id: null, address: 5, point_type: 2, control_mode: 1, status: 0, linked_device_name: null },
  { id: 6, panel_id: 1, point_code: 'ML-001-06', point_name: '消防广播', device_id: 13, address: 6, point_type: 1, control_mode: 1, status: 0, linked_device_name: '消防广播' },
  { id: 7, panel_id: 1, point_code: 'ML-001-07', point_name: '应急照明', device_id: null, address: 7, point_type: 1, control_mode: 1, status: 0, linked_device_name: null },
  { id: 8, panel_id: 1, point_code: 'ML-001-08', point_name: '备用', device_id: null, address: 8, point_type: 1, control_mode: 1, status: 0, linked_device_name: null },
];

export const mockBusPanels = [
  { id: 1, panel_code: 'BUS-001', panel_name: '1#总线盘', device_id: 1, loop_no: 1, total_points: 64, page_size: 32, status: 1 },
];

export const mockBusPoints = [
  { id: 1, panel_id: 1, point_code: 'BUS-001-001', point_name: '1-1感烟探测器', device_id: 3, loop_no: 1, address: 1, point_type: 1, status: 0, linked_device_name: '1号楼3层感烟探测器' },
  { id: 2, panel_id: 1, point_code: 'BUS-001-002', point_name: '1-2感烟探测器', device_id: null, loop_no: 1, address: 2, point_type: 1, status: 0, linked_device_name: null },
  { id: 3, panel_id: 1, point_code: 'BUS-001-003', point_name: '1-3感温探测器', device_id: 5, loop_no: 1, address: 3, point_type: 2, status: 0, linked_device_name: '地下车库感温探测器' },
  { id: 4, panel_id: 1, point_code: 'BUS-001-004', point_name: '1-4手动报警', device_id: 6, loop_no: 1, address: 4, point_type: 3, status: 0, linked_device_name: '1号楼1层手动报警按钮' },
  { id: 5, panel_id: 1, point_code: 'BUS-001-005', point_name: '1-5卷帘门', device_id: 11, loop_no: 1, address: 5, point_type: 4, status: 0, linked_device_name: '防火卷帘' },
  { id: 6, panel_id: 1, point_code: 'BUS-001-006', point_name: '1-6防火阀', device_id: 12, loop_no: 1, address: 6, point_type: 5, status: 0, linked_device_name: '防火阀' },
  { id: 7, panel_id: 1, point_code: 'BUS-001-007', point_name: '1-7声光报警', device_id: 13, loop_no: 1, address: 7, point_type: 6, status: 0, linked_device_name: '消防广播' },
  { id: 8, panel_id: 1, point_code: 'BUS-001-008', point_name: '1-8广播模块', device_id: 13, loop_no: 1, address: 8, point_type: 5, status: 0, linked_device_name: '消防广播' },
];

export const mockLinkageRules = [
  { id: 1, rule_code: 'RULE-001', rule_name: '火警联动视频', rule_type: 1, trigger_condition: '{"alarmTypes":[1]}', linkage_action: '{"actions":[{"type":"video"},{"type":"popup"},{"type":"record"},{"type":"ai"}]}', effective_time: '{"type":"all"}', priority: 1, status: 1, org_id: null, description: '火警发生时自动调取关联视频、录像并进行AI识别', trigger_count: 15 },
  { id: 2, rule_code: 'RULE-002', rule_name: '故障联动视频', rule_type: 2, trigger_condition: '{"alarmTypes":[2]}', linkage_action: '{"actions":[{"type":"video"},{"type":"notify"}]}', effective_time: '{"type":"day"}', priority: 2, status: 1, org_id: null, description: '故障报警时调取关联视频并通知值班人员', trigger_count: 8 },
  { id: 3, rule_code: 'RULE-003', rule_name: 'AI烟火识别联动', rule_type: 4, trigger_condition: '{"alarmTypes":[4]}', linkage_action: '{"actions":[{"type":"ai"},{"type":"record"},{"type":"notify"}]}', effective_time: '{"type":"all"}', priority: 1, status: 1, org_id: null, description: 'AI识别到烟火时自动录像并推送告警', trigger_count: 23 },
];

export const mockLinkageRecords = [
  { id: 1, record_code: 'LINK-20250419001', rule_id: 1, rule_name: '火警联动视频', alarm_event_code: 'FIRE-20250419001', alarm_type: 1, alarm_device_name: '1号楼3层感烟探测器', alarm_location: '301室', org_id: 1, org_name: '成都万达广场', linkage_time: '2025-04-19 10:23:20', action_type: 1, action_status: 2, action_time: '2025-04-19 10:23:25', ai_result: '{"fireDetection":false,"smokeDetection":true}', camera_name: '3层走廊摄像头' },
  { id: 2, record_code: 'LINK-20250419002', rule_id: 2, rule_name: '故障联动视频', alarm_event_code: 'FAULT-20250419001', alarm_type: 2, alarm_device_name: '1号楼3层感烟探测器', alarm_location: '301室', org_id: 1, org_name: '成都万达广场', linkage_time: '2025-04-19 10:15:30', action_type: 1, action_status: 2, action_time: '2025-04-19 10:15:35', ai_result: null, camera_name: '3层走廊摄像头' },
];

export const mockAIConfigs = [
  { id: 1, config_type: 1, config_name: '烟火识别', sensitivity: 1, threshold: 85, min_duration: 3, max_detection: 10, whitelist_configs: null, model_version: 'YOLOv8-v2.1', status: 1, event_count: 50 },
  { id: 2, config_type: 2, config_name: '通道占用', sensitivity: 1, threshold: 80, min_duration: 10, max_detection: 10, whitelist_configs: null, model_version: 'YOLOv8-v2.1', status: 1, event_count: 120 },
  { id: 3, config_type: 3, config_name: '人员离岗', sensitivity: 2, threshold: 75, min_duration: 30, max_detection: 5, whitelist_configs: null, model_version: 'YOLOv8-v2.1', status: 1, event_count: 30 },
  { id: 4, config_type: 4, config_name: '物品遗留', sensitivity: 2, threshold: 70, min_duration: 60, max_detection: 8, whitelist_configs: null, model_version: 'YOLOv8-v2.1', status: 1, event_count: 25 },
  { id: 5, config_type: 5, config_name: '人员聚集', sensitivity: 3, threshold: 65, min_duration: 30, max_detection: 10, whitelist_configs: null, model_version: 'YOLOv8-v2.1', status: 0, event_count: 45 },
];

export const mockPatrolPlans = [
  { id: 1, plan_code: 'PLAN-001', plan_name: '日常消防巡检', plan_type: 1, patrol_content: '检查消防设施运行状态、安全通道畅通情况', cycle_type: 1, status: 1, executor_names: '值班员A,值班员B' },
  { id: 2, plan_code: 'PLAN-002', plan_name: '月度设备专项检查', plan_type: 2, patrol_content: '对所有消防设备进行全面检查测试', cycle_type: 3, status: 1, executor_names: '消防主管' },
];

export const mockPatrolTasks = [
  { id: 1, task_code: 'TASK-20250419001', plan_id: 1, task_name: '日常巡检-早班', executor_name: '值班员A', plan_date: '2025-04-19', status: 2, completed_count: 12, total_count: 15, abnormal_count: 1, result: 2 },
  { id: 2, task_code: 'TASK-20250419002', plan_id: 1, task_name: '日常巡检-晚班', executor_name: '消防主管', plan_date: '2025-04-19', status: 0, completed_count: 0, total_count: 15, abnormal_count: 0, result: null },
];

export const mockHazards = [
  { id: 1, hazard_code: 'HAZARD-20250419001', device_name: '1号楼3层感烟探测器', hazard_type: 3, hazard_level: 1, hazard_desc: '设备外壳有轻微破损', hazard_location: '301室天花板', discover_time: '2025-04-19 09:30:00', discover_user: '值班员A', status: 0, rect_result: null, rect_user: null, check_result: null },
  { id: 2, hazard_code: 'HAZARD-20250419002', device_name: null, hazard_type: 1, hazard_level: 2, hazard_desc: 'B2层消防通道有杂物堆放', hazard_location: 'B2-A区通道', discover_time: '2025-04-19 10:00:00', discover_user: '值班员A', status: 1, rect_result: '已通知保洁清理', rect_user: '值班员B', check_result: null },
];

export const mockPreplans = [
  { id: 1, preplan_code: 'PLAN-FIRE-001', preplan_name: '万达广场火灾应急预案', preplan_type: 1, level: 1, org_name: '成都万达广场', version: 'V2.0', status: 1, applicable_scene: '适用于万达广场各建筑火灾事故' },
  { id: 2, preplan_code: 'PLAN-FIRE-002', preplan_name: '医院火灾应急预案', preplan_type: 1, level: 2, org_name: '华西医院', version: 'V1.0', status: 1, applicable_scene: '适用于医院各建筑火灾事故' },
];

export const mockPlanRecords = [
  { id: 1, preplan_id: 1, preplan_name: '万达广场火灾应急预案', trigger_type: 1, alarm_event_code: 'FIRE-20250418001', start_time: '2025-04-18 10:30:00', end_time: '2025-04-18 11:45:00', duration: 75, status: 2 },
];

export const mockShieldRecords = [
  { id: 1, shield_code: 'SHIELD-20250419001', device_id: 3, device_name: '1号楼3层感烟探测器', shield_type: 1, shield_reason: '设备调试更换', shield_start: '2025-04-19 10:00:00', shield_end: '2025-04-19 11:00:00', shield_duration: 60, shield_user: 'operator', unshield_time: null, unshield_user: null, status: 1, auto_unshield: 1 },
  { id: 2, shield_code: 'SHIELD-20250419002', device_id: 5, device_name: '地下车库感温探测器', shield_type: 1, shield_reason: '区域装修施工', shield_start: '2025-04-19 08:00:00', shield_end: '2025-04-19 12:00:00', shield_duration: 240, shield_user: 'operator', unshield_time: null, unshield_user: null, status: 1, auto_unshield: 1 },
];

export const mockCommands = [
  { id: 1, command_code: 'CMD-20250419001', command_type: 1, device_id: 1, device_name: '1#火灾报警控制器', command_value: null, command_time: '2025-04-19 14:00:00', command_user: 'admin', command_status: 2, response_result: '消音成功' },
  { id: 2, command_code: 'CMD-20250419002', command_type: 2, device_id: 1, device_name: '1#火灾报警控制器', command_value: null, command_time: '2025-04-19 13:30:00', command_user: 'admin', command_status: 2, response_result: '复位成功' },
  { id: 3, command_code: 'CMD-20250419003', command_type: 3, device_id: 1, device_name: '1#火灾报警控制器', command_value: null, command_time: '2025-04-19 13:00:00', command_user: 'admin', command_status: 2, response_result: '切换为手动模式' },
];

export const mockAlarmStats = {
  fireTotal: 128, firePending: 1, faultTotal: 56, faultPending: 2, feedbackTotal: 35, todayFire: 3, todayFault: 3, todayFeedback: 2,
};

export const mockDashboardStats = {
  totalUnits: 5, totalDevices: 3100, onlineDevices: 2985, offlineDevices: 115, onlineRate: 96.3,
  totalFireAlarms: 128, totalFaultAlarms: 56, todayFireAlarms: 3, todayFaultAlarms: 3,
  totalHazards: 23, unresolvedHazards: 5, patrolCompletion: 92.5,
  deviceTypes: [
    { name: '火灾报警', count: 1050 }, { name: '消防给水', count: 320 },
    { name: '防排烟', count: 410 }, { name: '消防联动', count: 520 },
    { name: '视频监控', count: 680 }, { name: '电气火灾', count: 120 },
  ],
  alarmTrend: [
    { date: '04-13', fire: 2, fault: 5 }, { date: '04-14', fire: 1, fault: 4 },
    { date: '04-15', fire: 3, fault: 6 }, { date: '04-16', fire: 0, fault: 3 },
    { date: '04-17', fire: 2, fault: 7 }, { date: '04-18', fire: 4, fault: 5 },
    { date: '04-19', fire: 3, fault: 3 },
  ],
  unitAlarmStats: [
    { name: '万达广场', fire: 15, fault: 38 }, { name: '国际金融中心', fire: 8, fault: 25 },
    { name: '太古里', fire: 5, fault: 18 }, { name: '天府软件园', fire: 3, fault: 12 },
    { name: '华西医院', fire: 22, fault: 45 },
  ],
};

export const mockMonitorOverview = {
  totalDevices: 3100, onlineDevices: 2985, offlineDevices: 115, onlineRate: 96.3,
  pendingFire: 1, pendingFault: 2, shieldCount: 2,
  totalCameras: 8, onlineCameras: 8, totalUnits: 5,
  todayAlarms: 3, weekAlarms: 18, multilinePoints: 8, busPoints: 64,
};

export const mockLoginLogs = [
  { id: 1, username: 'admin', login_type: 2, ip_address: '192.168.1.100', status: 1, login_time: '2025-04-19 14:30:00' },
  { id: 2, username: 'operator', login_type: 2, ip_address: '192.168.1.101', status: 1, login_time: '2025-04-19 13:00:00' },
  { id: 3, username: 'admin', login_type: 2, ip_address: '192.168.1.100', status: 0, login_time: '2025-04-19 08:15:00' },
];
