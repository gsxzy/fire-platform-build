export interface DutyRecord {
  stage: string;
  person: string;
  time: string;
  action: string;
  completed: boolean;
}

export interface ProcessStep {
  label: string;
  desc: string;
  completed: boolean;
  active: boolean;
}

export interface AlarmDetailModalProps {
  alarm: any;
  onClose: () => void;
  /** 消控室ID，传入后优先显示该消控室关联的摄像头 */
  controlRoomId?: string | number;
}
