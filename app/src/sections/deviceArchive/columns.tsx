import {
  typeMap,
  archiveStatusMap,
  archiveStatusColorMap,
  onlineStatusMap,
  typeColorMap,
  onlineStatusColorMap,
} from './utils';

export const COLUMNS = [
  { key: 'deviceNo', label: '设备编号', width: '110px' },
  { key: 'id', label: '档案ID', width: '72px' },
  { key: 'name', label: '设备名称', width: '160px' },
  {
    key: 'type',
    label: '设备类型',
    width: '120px',
    render: (v: unknown) => {
      const type = String(v);
      const label = typeMap[type] || type;
      const style = typeColorMap[type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'archiveStatus',
    label: '档案状态',
    width: '90px',
    render: (v: unknown) => {
      const status = String(v);
      const label = archiveStatusMap[status] || status;
      const style = archiveStatusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  { key: 'unitName', label: '所属单位', width: '160px' },
  { key: 'manufacturer', label: '生产厂家', width: '100px' },
  { key: 'location', label: '安装位置', width: '130px' },
  { key: 'ip', label: 'IP地址', width: '110px' },
  {
    key: 'gatewayId',
    label: '关联网关(SN)',
    width: '130px',
    render: (v: unknown) => {
      const sn = String(v || '');
      return sn ? (
        <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
          {sn}
        </span>
      ) : (
        <span className="text-[10px] text-slate-500">-</span>
      );
    },
  },
  { key: 'warrantyExpire', label: '质保到期', width: '95px' },
  { key: 'maintenanceExpire', label: '维保到期', width: '95px' },
  {
    key: 'onlineStatus',
    label: '在线状态',
    width: '80px',
    render: (v: unknown) => {
      const s = String(v);
      const label = onlineStatusMap[s] || s;
      const style = onlineStatusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];
