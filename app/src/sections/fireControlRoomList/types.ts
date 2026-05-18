export interface ControlRoom {
  id: string;
  unitId?: string;
  unitName: string;
  projectName?: string;
  controllerModel: string;
  hostNo: string;
  busDevices: number;
  busPoints: number;
  multilineDevices: number;
  multilinePoints: number;
  serviceStart: string;
  serviceEnd: string;
  online: boolean;
}
