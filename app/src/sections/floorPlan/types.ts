export interface Unit {
  id: string;
  name: string;
  type: string;
  address?: string;
}

export interface Building {
  id: number;
  name: string;
  unit_id: string;
  type: string;
  total_floors: number;
  address?: string;
}

export interface Floor {
  id: number;
  name: string;
  floor_number: number;
  building_id: number;
  plan_image_url?: string;
  plan_width?: number;
  plan_height?: number;
  plan_type?: string;
  plan_cad_data?: string | Record<string, unknown>;
}

export interface CadBounds {
  minx?: number;
  miny?: number;
  maxx?: number;
  maxy?: number;
}

export interface FloorDevice {
  position_id: number;
  device_id: string;
  x: number;
  y: number;
  device_name: string;
  device_code: string;
  device_type: string;
  status: number;
  bind_camera_id?: string;
  bind_camera_channel?: string;
}

export interface UnmarkedDevice {
  id: number;
  device_id: string;
  device_name: string;
  device_code: string;
  device_type: string;
  status: number;
}

export interface CameraBinding {
  id: number;
  floor_id: number;
  camera_device_id: string;
  bound_device_ids: string[];
  x: number;
  y: number;
  preset_no: number;
  stream_url?: string;
  camera_name?: string;
}

export interface AlarmMessage {
  type: string;
  device_id?: string;
  device_name?: string;
  alarm_type?: string;
}
