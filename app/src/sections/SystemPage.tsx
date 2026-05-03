import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User, Role } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Users, Shield, Building2, ScrollText, Search,
  Edit, Trash2, UserPlus
} from 'lucide-react';

export default function SystemPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [userDialog, setUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<Partial<User>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, r, o, logs]: any = await Promise.all([
        api.getUsers({ size: 100 }),
        api.getRoles(),
        api.getOrgs(),
        api.getLoginLogs({ size: 20 }),
      ]);
      setUsers(u.list);
      setRoles(r);
      setOrgs(o);
      setLoginLogs(logs.list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async () => {
    try {
      if (editUser.id) {
        await api.updateUser(editUser.id, editUser);
      } else {
        await api.createUser({ ...editUser, password: '123456' });
      }
      setUserDialog(false);
      setEditUser({});
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确认删除此用户？')) return;
    try {
      await api.deleteUser(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u =>
    !keyword || u.username?.includes(keyword) || u.real_name?.includes(keyword)
  );

  const userTypeName = (type: number) => {
    switch (type) {
      case 1: return '值班员';
      case 2: return '管理员';
      case 3: return '超级管理员';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">系统管理</h2>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Users className="w-4 h-4 mr-1" /> 用户管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Shield className="w-4 h-4 mr-1" /> 角色权限
          </TabsTrigger>
          <TabsTrigger value="orgs" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Building2 className="w-4 h-4 mr-1" /> 组织架构
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <ScrollText className="w-4 h-4 mr-1" /> 日志管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-300">用户列表 ({filteredUsers.length})</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input placeholder="搜索..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
                      className="pl-8 h-8 text-sm bg-slate-700 border-slate-600 text-slate-200 w-48" />
                  </div>
                  <Button size="sm" className="h-8 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => { setEditUser({}); setUserDialog(true); }}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> 新增
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">用户名</th>
                      <th className="text-left p-3 text-slate-400 font-medium">姓名</th>
                      <th className="text-left p-3 text-slate-400 font-medium">手机</th>
                      <th className="text-left p-3 text-slate-400 font-medium">邮箱</th>
                      <th className="text-left p-3 text-slate-400 font-medium">类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                      <th className="text-left p-3 text-slate-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-200">{user.username}</td>
                        <td className="p-3 text-slate-300">{user.real_name || '-'}</td>
                        <td className="p-3 text-slate-400">{user.phone || '-'}</td>
                        <td className="p-3 text-slate-400">{user.email || '-'}</td>
                        <td className="p-3 text-slate-400">{userTypeName(user.user_type)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={user.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                            {user.status === 1 ? '正常' : '禁用'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              onClick={() => { setEditUser(user); setUserDialog(true); }} aria-label="编辑">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleDeleteUser(user.id)} aria-label="删除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">角色编码</th>
                      <th className="text-left p-3 text-slate-400 font-medium">角色名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(role => (
                      <tr key={role.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{role.role_code}</td>
                        <td className="p-3 text-slate-200">{role.role_name}</td>
                        <td className="p-3 text-slate-400">{role.role_type === 1 ? '系统角色' : '自定义'}</td>
                        <td className="p-3 text-slate-400">{role.description || '-'}</td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">暂无角色数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orgs.map(org => (
              <Card key={org.id} className="border-slate-700/50 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-200">{org.org_name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{org.org_code || '-'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>负责人: {org.leader || '-'} {org.phone ? `(${org.phone})` : ''}</p>
                    <p>地址: {org.address || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {orgs.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-500">暂无组织架构数据</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">登录日志</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">用户</th>
                      <th className="text-left p-3 text-slate-400 font-medium">登录类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">IP地址</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                      <th className="text-left p-3 text-slate-400 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map((log: any, i: number) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-200">{log.username}</td>
                        <td className="p-3 text-slate-400">{log.login_type === 1 ? '网页端' : '移动端'}</td>
                        <td className="p-3 text-slate-400 font-mono text-xs">{log.ip_address}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={log.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                            {log.status === 1 ? '成功' : '失败'}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{log.login_time}</td>
                      </tr>
                    ))}
                    {loginLogs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">暂无日志数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editUser.id ? '编辑用户' : '新增用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">用户名</Label>
              <Input value={editUser.username || ''} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-200 mt-1" placeholder="请输入用户名" />
            </div>
            <div>
              <Label className="text-slate-300">真实姓名</Label>
              <Input value={editUser.real_name || ''} onChange={(e) => setEditUser({ ...editUser, real_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-200 mt-1" placeholder="请输入真实姓名" />
            </div>
            <div>
              <Label className="text-slate-300">手机号</Label>
              <Input value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-slate-200 mt-1" placeholder="请输入手机号" />
            </div>
            <div>
              <Label className="text-slate-300">用户类型</Label>
              <select value={editUser.user_type || 1} onChange={(e) => setEditUser({ ...editUser, user_type: parseInt(e.target.value) })}
                className="w-full mt-1 h-9 rounded-md bg-slate-700 border-slate-600 text-slate-200 px-3">
                <option value={1}>值班员</option>
                <option value={2}>管理员</option>
                <option value={3}>超级管理员</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)} className="border-slate-600 text-slate-300">取消</Button>
            <Button onClick={handleSaveUser} className="bg-blue-500 hover:bg-blue-600 text-white">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
