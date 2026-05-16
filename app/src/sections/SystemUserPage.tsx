import PageTemplate from '@/sections/PageTemplate';
import { userService } from '@/api/services';
import { Users } from 'lucide-react';

const statusMap: Record<string, string> = {
  active: '正常',
  disabled: '停用',
};

const statusColorMap: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  disabled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const roleMap: Record<string, string> = {
  super_admin: '超级管理员',
  unit_admin: '单位管理员',
  operator: '操作员',
  inspector: '巡查员',
  maintainer: '维保员',
};

const roleColorMap: Record<string, string> = {
  super_admin: 'text-red-400 bg-red-500/10 border-red-500/20',
  unit_admin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  operator: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  inspector: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  maintainer: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const COLUMNS = [
  { key: 'username', label: '用户名', width: '120px' },
  { key: 'realName', label: '真实姓名', width: '100px' },
  { key: 'phone', label: '手机号', width: '130px' },
  { key: 'email', label: '邮箱', width: '160px' },
  { key: 'unitName', label: '部门', width: '150px' },
  {
    key: 'role',
    label: '角色',
    width: '110px',
    render: (v: unknown) => {
      const role = String(v);
      const label = roleMap[role] || role;
      const style = roleColorMap[role] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
  {
    key: 'status',
    label: '状态',
    width: '80px',
    render: (v: unknown) => {
      const status = String(v);
      const label = statusMap[status] || status;
      const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
    },
  },
];

const FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const, required: true },
  { key: 'realName', label: '真实姓名', type: 'text' as const, required: true },
  { key: 'phone', label: '手机号', type: 'text' as const, required: true },
  { key: 'email', label: '邮箱', type: 'text' as const },
  {
    key: 'role',
    label: '角色',
    type: 'select' as const,
    required: true,
    options: [
      { label: '超级管理员', value: 'super_admin' },
      { label: '单位管理员', value: 'unit_admin' },
      { label: '操作员', value: 'operator' },
      { label: '巡查员', value: 'inspector' },
      { label: '维保员', value: 'maintainer' },
    ],
  },
  { key: 'unitName', label: '部门', type: 'text' as const },
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
    key: 'role',
    label: '角色',
    options: [
      { label: '超级管理员', value: 'super_admin' },
      { label: '单位管理员', value: 'unit_admin' },
      { label: '操作员', value: 'operator' },
      { label: '巡查员', value: 'inspector' },
      { label: '维保员', value: 'maintainer' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '停用', value: 'disabled' },
    ],
  },
];

export default function SystemUserPage() {
  return (
    <PageTemplate
      title="用户管理"
      icon={Users}
      columns={COLUMNS}
      service={userService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      emptyDescription="登录账号与角色绑定后登录平台。列表为空时请检查用户接口或先创建管理员账号。"
    />
  );
}
