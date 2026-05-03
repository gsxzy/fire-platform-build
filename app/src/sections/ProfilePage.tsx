import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Shield, Clock, Key, Phone, Mail, Building2, Edit3,
  Save, X
} from 'lucide-react';

const fallbackUserInfo = {
  username: 'admin',
  realName: '系统管理员',
  role: '超级管理员',
  unit: '新致远智慧消防平台总部',
  phone: '13919881234',
  email: 'admin@xyzfire.com',
  department: '技术运维部',
  joinDate: '2023-06-01',
  lastLogin: '2025-02-01 10:23:15',
  loginIp: '192.168.1.100',
  status: '正常',
};

const fallbackOperationLogs = [
  { time: '2025-02-01 10:23:15', action: '登录系统', module: '系统', result: '成功', ip: '192.168.1.100' },
  { time: '2025-02-01 10:25:38', action: '新增单位', module: '单位管理', result: '成功', ip: '192.168.1.100' },
  { time: '2025-02-01 10:28:42', action: '修改设备配置', module: '设备管理', result: '成功', ip: '192.168.1.100' },
  { time: '2025-01-31 18:15:22', action: '确认火警', module: '告警中心', result: '成功', ip: '192.168.1.100' },
  { time: '2025-01-31 16:30:05', action: '导出报表', module: '数据分析', result: '成功', ip: '192.168.1.100' },
  { time: '2025-01-30 09:45:33', action: '创建维保工单', module: '维保管理', result: '成功', ip: '192.168.1.100' },
  { time: '2025-01-30 08:20:18', action: '修改密码', module: '系统管理', result: '成功', ip: '192.168.1.100' },
  { time: '2025-01-29 17:55:42', action: '退出登录', module: '系统', result: '成功', ip: '192.168.1.100' },
];

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [userInfo, setUserInfo] = useState(fallbackUserInfo as any);
  const [operationLogs, setOperationLogs] = useState(fallbackOperationLogs as any);
  const [form, setForm] = useState({ ...userInfo });
  const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '' });
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    legacyApi.profile().then((res: any) => {
      if (res.data) setUserInfo(res.data as any);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    legacyApi.logList().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setOperationLogs(list);
    }).catch(() => {});
  }, []);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-100 leading-tight">个人中心</h2>
            <p className="text-[10px] text-slate-500">账号信息与安全设置</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Left: User Info Card */}
        <Card className="border-slate-700/50 bg-slate-800/50 xl:col-span-1">
          <CardContent className="p-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-100">{userInfo.realName}</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 mt-1">{userInfo.role}</Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">用户名</span><span className="text-slate-200 font-mono">{userInfo.username}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">所属单位</span><span className="text-slate-200">{userInfo.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">部门</span><span className="text-slate-200">{userInfo.department}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">入职日期</span><span className="text-slate-200">{userInfo.joinDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">账号状态</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{userInfo.status}</Badge>
              </div>
              <div className="border-t border-slate-700/30 pt-2 mt-2">
                <div className="flex justify-between"><span className="text-slate-500">最后登录</span><span className="text-slate-200 font-mono">{userInfo.lastLogin}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">登录IP</span><span className="text-slate-200 font-mono">{userInfo.loginIp}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Tabs */}
        <Card className="border-slate-700/50 bg-slate-800/50 xl:col-span-2 flex flex-col min-h-0">
          <CardContent className="p-0 flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
                <TabsList className="bg-slate-800/50 border border-slate-700/50 h-8">
                  <TabsTrigger value="info" className="text-[10px] h-6 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                    <User className="w-3 h-3 mr-1" />基本信息
                  </TabsTrigger>
                  <TabsTrigger value="password" className="text-[10px] h-6 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                    <Key className="w-3 h-3 mr-1" />修改密码
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="text-[10px] h-6 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                    <Clock className="w-3 h-3 mr-1" />操作记录
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Info Tab */}
              <TabsContent value="info" className="flex-1 overflow-y-auto scrollbar-thin m-0 p-3 space-y-3 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300 font-medium">基础信息</span>
                  {!editing ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 text-[10px] text-blue-400 hover:text-blue-300"><Edit3 className="w-3 h-3 mr-0.5" />编辑</Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm({ ...userInfo }); }} className="h-7 text-[10px] text-slate-400"><X className="w-3 h-3 mr-0.5" />取消</Button>
                      <Button size="sm" onClick={() => setEditing(false)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700"><Save className="w-3 h-3 mr-0.5" />保存</Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-slate-400 text-[11px]">真实姓名</Label>
                    {editing ? <Input value={form.realName} onChange={e => setForm({ ...form, realName: e.target.value })} className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" />
                      : <div className="text-xs text-slate-200 mt-0.5">{form.realName}</div>}
                  </div>
                  <div><Label className="text-slate-400 text-[11px]">联系电话</Label>
                    {editing ? <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" />
                      : <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" />{form.phone}</div>}
                  </div>
                  <div><Label className="text-slate-400 text-[11px]">邮箱</Label>
                    {editing ? <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" />
                      : <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" />{form.email}</div>}
                  </div>
                  <div><Label className="text-slate-400 text-[11px]">所属部门</Label>
                    {editing ? <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" />
                      : <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-500" />{form.department}</div>}
                  </div>
                </div>

                <div className="border-t border-slate-700/30 pt-3">
                  <span className="text-xs text-slate-300 font-medium block mb-2">安全设置</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Shield className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-200 font-medium">登录密码</div>
                          <div className="text-[9px] text-slate-500">建议定期更换密码</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-300 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" onClick={() => setActiveTab('password')}>修改</Button>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Phone className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-200 font-medium">手机绑定</div>
                          <div className="text-[9px] text-slate-500">已绑定：{form.phone}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">已绑定</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Mail className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-200 font-medium">邮箱绑定</div>
                          <div className="text-[9px] text-slate-500">已绑定：{form.email}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">已绑定</Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Password Tab */}
              <TabsContent value="password" className="flex-1 overflow-y-auto scrollbar-thin m-0 p-3 space-y-3">
                <div className="space-y-3 max-w-sm">
                  <div><Label className="text-slate-300 text-[11px]">当前密码 <span className="text-red-400">*</span></Label>
                    <Input type="password" value={pwdForm.old} onChange={e => setPwdForm({ ...pwdForm, old: e.target.value })} placeholder="请输入当前密码" className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" /></div>
                  <div><Label className="text-slate-300 text-[11px]">新密码 <span className="text-red-400">*</span></Label>
                    <Input type="password" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} placeholder="8-20位，含字母和数字" className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" /></div>
                  <div><Label className="text-slate-300 text-[11px]">确认新密码 <span className="text-red-400">*</span></Label>
                    <Input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} placeholder="请再次输入新密码" className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 mt-0.5" /></div>
                  <Button
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 mt-2"
                    onClick={() => {
                      if (!pwdForm.old || !pwdForm.new || !pwdForm.confirm) { alert('请填写所有密码字段'); return; }
                      if (pwdForm.new !== pwdForm.confirm) { alert('两次输入的新密码不一致'); return; }
                      if (pwdForm.new.length < 8) { alert('新密码长度不能少于8位'); return; }
                      legacyApi.changePassword(pwdForm.old, pwdForm.new).then(() => {
                        alert('密码修改成功');
                        setPwdForm({ old: '', new: '', confirm: '' });
                        setActiveTab('info');
                      }).catch(() => alert('密码修改失败'));
                    }}
                  >保存修改</Button>
                </div>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="flex-1 overflow-y-auto scrollbar-thin m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
                  <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                    <span className="col-span-3">操作时间</span>
                    <span className="col-span-3">操作内容</span>
                    <span className="col-span-2">模块</span>
                    <span className="col-span-2">结果</span>
                    <span className="col-span-2">IP地址</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
                  {operationLogs.map((log: any, i: number) => (
                    <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded border border-slate-700/20 bg-slate-800/20 items-center">
                      <span className="col-span-3 text-[9px] text-slate-400 font-mono">{log.time}</span>
                      <span className="col-span-3 text-[10px] text-slate-200">{log.action}</span>
                      <span className="col-span-2 text-[9px] text-slate-400">{log.module}</span>
                      <span className="col-span-2"><Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">{log.result}</Badge></span>
                      <span className="col-span-2 text-[9px] text-slate-500 font-mono">{log.ip}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
