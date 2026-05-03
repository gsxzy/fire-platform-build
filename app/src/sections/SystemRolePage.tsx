import PageTemplate from '@/sections/PageTemplate';
import { roleService } from '@/api/services';
import { Shield } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: '角色名称', width: '150px' },
  { key: 'code', label: '角色编码', width: '120px' },
  { key: 'description', label: '描述', width: '250px' },
  { key: 'users', label: '用户数', width: '80px' },
  { key: 'perms', label: '权限数', width: '80px' },
  { key: 'status', label: '状态', width: '80px' },
];

const FIELDS = [
  { key: 'name', label: '角色名称', type: 'text' as const, required: true },
  { key: 'code', label: '角色编码', type: 'text' as const, required: true },
  { key: 'description', label: '描述', type: 'textarea' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'disabled'] },
];

export default function SystemRolePage() {
  return <PageTemplate title="角色管理" icon={Shield} columns={COLUMNS} service={roleService as any} fields={FIELDS} />;
}
