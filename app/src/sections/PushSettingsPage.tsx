import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bell, MessageSquare, Phone, Mail, Radio,
  Clock, Shield, AlertTriangle, Flame, Volume2, Smartphone
} from 'lucide-react';

const fallbackChannelSettings = [
  { id: 'inapp', name: '站内消息', icon: Bell, desc: '平台内部消息通知', enabled: true },
  { id: 'sms', name: '短信推送', icon: MessageSquare, desc: '通过短信发送告警通知', enabled: true },
  { id: 'voice', name: '语音电话', icon: Phone, desc: '自动语音电话告警通知', enabled: false },
  { id: 'email', name: '邮件通知', icon: Mail, desc: '通过邮件发送告警和报表', enabled: true },
  { id: 'wechat', name: '微信推送', icon: Smartphone, desc: '通过微信企业号推送消息', enabled: true },
  { id: 'app_push', name: 'APP推送', icon: Radio, desc: '手机APP推送通知', enabled: true },
];

const fallbackAlarmRules = [
  { id: 1, name: '火警紧急推送', type: 'fire', level: '紧急', channels: ['inapp', 'sms', 'voice', 'app_push'], delay: 0, enabled: true },
  { id: 2, name: '火警一般推送', type: 'fire', level: '一般', channels: ['inapp', 'sms'], delay: 30, enabled: true },
  { id: 3, name: '设备故障推送', type: 'fault', level: '严重', channels: ['inapp', 'sms', 'email'], delay: 60, enabled: true },
  { id: 4, name: '设备故障一般', type: 'fault', level: '一般', channels: ['inapp'], delay: 300, enabled: true },
  { id: 5, name: '预警通知', type: 'prewarn', level: '提示', channels: ['inapp', 'email'], delay: 0, enabled: true },
  { id: 6, name: '监管事件', type: 'supervise', level: '一般', channels: ['inapp'], delay: 0, enabled: false },
];

const fallbackQuietHours = { start: '22:00', end: '07:00', enabled: true };

const channelIcon = (id: string) => {
  switch (id) {
    case 'inapp': return <Bell className="w-3 h-3" />;
    case 'sms': return <MessageSquare className="w-3 h-3" />;
    case 'voice': return <Phone className="w-3 h-3" />;
    case 'email': return <Mail className="w-3 h-3" />;
    case 'wechat': return <Smartphone className="w-3 h-3" />;
    case 'app_push': return <Radio className="w-3 h-3" />;
    default: return <Bell className="w-3 h-3" />;
  }
};

export default function PushSettingsPage() {
  const [channels, setChannels] = useState(fallbackChannelSettings as any);
  const [rules, setRules] = useState(fallbackAlarmRules as any);
  const [quietHours, setQuietHours] = useState(fallbackQuietHours as any);

  useEffect(() => {
    legacyApi.notifyTemplateList().then((res: any) => {
      if (res.data) {
        if (Array.isArray(res.data.channelSettings)) setChannels(res.data.channelSettings as any);
        if (Array.isArray(res.data.alarmRules)) setRules(res.data.alarmRules as any);
        if (res.data.quietHours) setQuietHours(res.data.quietHours as any);
      }
    }).catch(() => {});
  }, []);

  const toggleChannel = (id: string) => {
    setChannels((prev: any) => prev.map((c: any) => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };
  const toggleRule = (id: number) => {
    setRules((prev: any) => prev.map((r: any) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">消息推送设置</h2>
            <p className="text-[10px] text-slate-500">通知渠道与模板配置</p>
          </div>
        </div>
      </div>

      {/* Push Channels */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-200">推送渠道配置</span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
            {channels.map((c: any) => {
              const Icon = c.icon;
              return (
                <div key={c.id} className={`p-2.5 rounded-lg border transition-all ${c.enabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-700/30 bg-slate-800/30 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${c.enabled ? 'text-blue-400' : 'text-slate-600'}`} />
                      <span className="text-[11px] text-slate-200 font-medium">{c.name}</span>
                    </div>
                    <Switch checked={c.enabled} onCheckedChange={() => toggleChannel(c.id)} />
                  </div>
                  <p className="text-[9px] text-slate-500">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alarm Push Rules */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-slate-200">告警推送规则</span>
          </div>
          <div className="space-y-2">
            {rules.map((r: any) => (
              <div key={r.id} className={`p-2.5 rounded-lg border transition-all ${r.enabled ? 'border-slate-700/40 bg-slate-800/30' : 'border-slate-700/20 bg-slate-800/20 opacity-50'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {r.type === 'fire' ? <Flame className="w-3.5 h-3.5 text-red-400" /> : r.type === 'fault' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> : <Shield className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="text-[11px] text-slate-200 font-medium">{r.name}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 ${r.level === '紧急' ? 'bg-red-500/20 text-red-400 border-red-500/30' : r.level === '严重' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>{r.level}</Badge>
                  </div>
                  <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-500">推送渠道：</span>
                  <div className="flex gap-0.5">
                    {r.channels.map((ch: any) => (
                      <span key={ch} className="w-5 h-5 rounded bg-slate-700/50 flex items-center justify-center text-slate-400">{channelIcon(ch)}</span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 ml-auto">延时：{r.delay === 0 ? '即时' : `${r.delay}秒`}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-slate-200">免打扰时段</span>
            <Switch checked={quietHours.enabled} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-slate-400">开始</Label>
              <Input defaultValue={quietHours.start} className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-slate-400">结束</Label>
              <Input defaultValue={quietHours.end} className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200" />
            </div>
            <span className="text-[9px] text-slate-500">免打扰时段内仅推送紧急火警，其他告警延后推送</span>
          </div>
        </CardContent>
      </Card>

      {/* Sound Alert */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">声音提醒</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '火警声音', desc: '紧急告警音', enabled: true },
              { label: '故障声音', desc: '提示音', enabled: true },
              { label: '预警声音', desc: '轻微提示', enabled: false },
            ].map((s: any, i: number) => (
              <div key={i} className="p-2 rounded border border-slate-700/30 bg-slate-800/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-200 block">{s.label}</span>
                  <span className="text-[8px] text-slate-500">{s.desc}</span>
                </div>
                <Switch checked={s.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 flex-shrink-0">
        <Button variant="outline" className="h-8 text-xs border-slate-600 text-slate-300">恢复默认</Button>
        <Button className="h-8 text-xs bg-blue-600 hover:bg-blue-700">保存设置</Button>
      </div>
    </div>
  );
}
