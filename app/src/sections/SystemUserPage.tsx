import PageTemplate from '@/sections/PageTemplate';
import { userService } from '@/api/services';
import { Users } from 'lucide-react';

const COLUMNS = [
  { key: 'username', label: '用户名', width: '120px' },
  { key: 'realName', label: '真实姓名', width: '100px' },
  { key: 'role', label: '角色', width: '120px' },
  { key: 'unitName', label: '所属单位', width: '180px' },
  { key: 'phone', label: '联系电话', width: '130px' },
  { key: 'status', label: '状态', width: '80px' },
];

const FIELDS = [
  { key: 'username', label: '用户名', type: 'text' as const, required: true },
  { key: 'realName', label: '真实姓名', type: 'text' as const, required: true },
  { key: 'role', label: '角色', type: 'select' as const, required: true, options: ['super_admin', 'unit_admin', 'operator', 'inspector', 'maintainer'] },
  { key: 'phone', label: '联系电话', type: 'text' as const, required: true },
  { key: 'email', label: '邮箱', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['active', 'disabled'] },
];

export default function SystemUserPage() {
  return <PageTemplate title="用户管理" icon={Users} columns={COLUMNS} service={userService as any} fields={FIELDS} />;
}
