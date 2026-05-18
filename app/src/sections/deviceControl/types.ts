export interface IoTDevice {
  id: number;
  device_id?: string;
  device_sn?: string;
  archive_device_id?: number;
  device_name: string;
  protocol?: string;
  protocol_type?: string;
  status: string;
  online_status: string;
  ip?: string | null;
  port?: number | null;
  location?: string | null;
  unit_name?: string | null;
}

export interface ControlLog {
  id: number;
  device_id: string;
  device_name: string;
  protocol: string;
  command: string;
  status: string;
  response: string | null;
  error_msg: string | null;
  sent_at: string;
  responded_at: string | null;
}
