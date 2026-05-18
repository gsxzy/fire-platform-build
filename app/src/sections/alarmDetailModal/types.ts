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
}
