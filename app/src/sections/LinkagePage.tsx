import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Link2, Plus, Flame, Link
} from 'lucide-react';

const linkageRulesInit = [
  { id: 1, name: '火警联动喷淋泵', trigger: '1F烟感报警', actions: ['启动喷淋泵', '打开水流指示器', '声光报警'], unit: '万达广场', enabled: true, status: '正常' },
  { id: 2, name: '排烟联动', trigger: 'B1温感报警', actions: ['启动排烟风机', '关闭防火卷帘', '打开排烟口'], unit: '万达广场', enabled: true, status: '正常' },
  { id: 3, name: '消防泵自动启动', trigger: '消火栓按钮按下', actions: ['启动消防泵', '稳压泵停止'], unit: '万达广场', enabled: true, status: '正常' },
  { id: 4, name: '电气火灾断电', trigger: '剩余电流超300mA', actions: ['切断故障回路电源', '声光报警', '上报平台'], unit: '兰州石化', enabled: true, status: '正常' },
  { id: 5, name: '防排烟联动', trigger: '2F烟感报警', actions: ['启动正压送风机', '打开送风口', '关闭空调系统'], unit: '兰大二院', enabled: false, status: '已停用' },
];

const executeRecordsInit = [
  { id: 1, ruleName: '火警联动喷淋泵', trigger: '1F大厅烟感报警', result: '成功', time: '2025-02-01 10:23:18', duration: '2.3秒' },
  { id: 2, ruleName: '排烟联动', trigger: 'B1停车场温感报警', result: '成功', time: '2025-02-01 10:18:45', duration: '1.8秒' },
  { id: 3, ruleName: '消防泵自动启动', trigger: '2F消火栓按钮', result: '成功', time: '2025-02-01 09:30:22', duration: '3.1秒' },
  { id: 4, ruleName: '电气火灾断电', trigger: '配电室漏电300mA', result: '成功', time: '2025-02-01 09:45:25', duration: '0.5秒' },
  { id: 5, ruleName: '火警联动喷淋泵', trigger: '3F走廊烟感报警', result: '成功', time: '2025-02-01 09:15:08', duration: '2.1秒' },
];

export default function LinkagePage() {
  const [rules, setRules] = useState(linkageRulesInit as any);
  const [executeRecords] = useState(executeRecordsInit as any);
  const [activeTab, setActiveTab] = useState<'rules' | 'records'>('rules');

  useEffect(() => {
    legacyApi.planList().then((res: any) => {
      const data = res.data ?? res;
      if (data && (Array.isArray(data) || typeof data === 'object')) {
        const list = Array.isArray(data) ? data : (data.list || []);
        if (list.length) setRules(list as any);
      }
    }).catch(() => {});
  }, []);

  const toggleRule = (id: number) => {
    setRules((prev: any) => prev.map((r: any) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Link className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">安消联动</h2>
            <p className="text-[10px] text-slate-500">安全与消防联动控制</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">{rules.length}条规则</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant={activeTab === 'rules' ? 'default' : 'outline'} onClick={() => setActiveTab('rules')} className="h-7 text-[10px]">
            联动规则
          </Button>
          <Button size="sm" variant={activeTab === 'records' ? 'default' : 'outline'} onClick={() => setActiveTab('records')} className="h-7 text-[10px]">
            执行记录
          </Button>
          <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700"><Plus className="w-3 h-3 mr-0.5" />新增规则</Button>
        </div>
      </div>

      {activeTab === 'rules' ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
          {rules.map((rule: any) => (
            <Card key={rule.id} className={`border ${rule.enabled ? 'border-slate-700/50' : 'border-slate-700/20 opacity-60'} bg-slate-800/50`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{rule.name}</span>
                    <Badge variant="outline" className="text-[8px] bg-slate-700/50 text-slate-400 border-slate-600 px-1">{rule.unit}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
                    <div className="text-[9px] text-red-400 mb-0.5 flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />触发条件</div>
                    <div className="text-[10px] text-slate-300">{rule.trigger}</div>
                  </div>
                  <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20">
                    <div className="text-[9px] text-blue-400 mb-0.5 flex items-center gap-0.5"><Link2 className="w-2.5 h-2.5" />联动动作</div>
                    <div className="text-[10px] text-slate-300">{rule.actions.join(' → ')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[8px] ${rule.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{rule.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                <span className="col-span-3">联动规则</span>
                <span className="col-span-3">触发条件</span>
                <span className="col-span-2">执行时间</span>
                <span className="col-span-2">响应时长</span>
                <span className="col-span-2">结果</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {executeRecords.map((r: any) => (
                <div key={r.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-3 text-[10px] text-slate-200">{r.ruleName}</span>
                  <span className="col-span-3 text-[9px] text-slate-400">{r.trigger}</span>
                  <span className="col-span-2 text-[9px] text-slate-500 font-mono">{r.time.split(' ')[1]}</span>
                  <span className="col-span-2 text-[9px] text-blue-400">{r.duration}</span>
                  <span className="col-span-2"><Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">{r.result}</Badge></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
