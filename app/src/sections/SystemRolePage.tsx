import PageTemplate from '@/sections/PageTemplate';
import { roleService } from '@/api/services';
import { Shield } from 'lucide-react';

const statusMap: Record<string, string> = {
  active: '正常',
  disabled: '停用',
};

const statusColorMap: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  disabled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const COLUMNS = [
  { key: 'name', label: '角色名称', width: '150px' },
  { key: 'code', label: '角色编码', width: '120px' },
  { key: 'description', label: '描述', width: '220px' },
  { key: 'users', label: '用户数', width: '70px' },
  { key: 'perms', label: '权限数', width: '70px' },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => {
      const status = v == null ? '' : String(v);
      const label = statusMap[status] || status;
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'name', label: '角色名称', type: 'text' as const, required: true },
  { key: 'code', label: '角色编码', type: 'text' as const, required: true },
  { key: 'description', label: '描述', type: 'textarea' as const },
  {
    key: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '正常', value: 'active' },
      { label: '停用', value: 'disabled' },
    ],
  },
];

const FILTER_FIELDS = [
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '停用', value: 'disabled' },
    ],
  },
];

export default function SystemRolePage() {
  return (
    <PageTemplate
      title="角色管理"
      icon={Shield}
      columns={COLUMNS}
      service={roleService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="角色与菜单、按钮权限绑定后生效。列表为空时请在数据库或权限接口中初始化角色后再同步。"
      permission={{
        create: 'system:role:create',
        update: 'system:role:edit',
        delete: 'system:role:delete',
      }}
    />
  );
}
