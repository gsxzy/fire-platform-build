import {
  typeMap,
  archiveStatusMap,
  archiveStatusColorMap,
  onlineStatusMap,
  typeColorMap,
  onlineStatusColorMap,
  protocolTypeMap,
} from './utils';

export const COLUMNS = [
  { key: 'deviceNo', label: '设备编号', width: '120px' },
  { key: 'name', label: '设备名称', width: '160px' },
  {
    key: 'type',
    label: '设备类型',
    width: '110px',
    render: (v: unknown) => {
      const type = v == null ? '' : String(v);
      const label = typeMap[type] || type || '-';
      const style = typeColorMap[type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'archiveStatus',
    label: '档案状态',
    width: '84px',
    render: (v: unknown) => {
      const status = v == null ? '' : String(v);
      const label = archiveStatusMap[status] || status || '-';
      const style = archiveStatusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'protocolType',
    label: '接入协议',
    width: '100px',
    render: (v: unknown) => {
      const pt = String(v || '');
      const label = protocolTypeMap[pt] || pt || '—';
      return <span className="text-[10px] text-slate-400">{label}</span>;
    },
  },
  { key: 'unitName', label: '所属单位', width: '140px' },
  { key: 'manufacturer', label: '生产厂家', width: '100px' },
  { key: 'location', label: '安装位置', width: '120px' },
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
  { key: 'warrantyExpire', label: '质保到期', width: '90px' },
  { key: 'maintenanceExpire', label: '维保到期', width: '90px' },
  {
    key: 'lastOnline',
    label: '最近上线',
    width: '110px',
    render: (v: unknown) => {
      const t = String(v || '');
      if (!t || t === 'null') return <span className="text-[10px] text-slate-500">-</span>;
      const date = new Date(t);
      if (Number.isNaN(date.getTime())) return <span className="text-[10px] text-slate-500">-</span>;
      const now = Date.now();
      const diff = now - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const isRecent = diff < 24 * 60 * 60 * 1000;
      const isWeek = diff < 7 * 24 * 60 * 60 * 1000;
      const color = isRecent ? 'text-emerald-400' : isWeek ? 'text-amber-400' : 'text-slate-500';
      const text = isRecent ? '24h内' : days < 30 ? `${days}天前` : `${Math.floor(days / 30)}月前`;
      return <span className={`text-[10px] ${color}`}>{text}</span>;
    },
  },
  {
    key: 'alarmCount',
    label: '告警',
    width: '56px',
    render: (v: unknown) => {
      const n = Number(v || 0);
      if (n <= 0) return <span className="text-[10px] text-slate-600">—</span>;
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 font-semibold">
          {n}
        </span>
      );
    },
  },
  {
    key: 'onlineStatus',
    label: '在线',
    width: '64px',
    render: (v: unknown) => {
      const s = v == null ? '' : String(v);
      const label = onlineStatusMap[s] || s || '-';
      const style = onlineStatusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];
