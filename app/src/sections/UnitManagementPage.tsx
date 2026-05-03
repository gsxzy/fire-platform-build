import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building2, Plus, Search, ChevronRight, ChevronLeft, Check, MapPin,
  FileText, Shield, Cpu, Bell, Radio, User, Store, Factory,
  ClipboardCheck, Eye, Edit, Monitor,
  Upload, CheckCircle2, XCircle, Settings,
  Activity, AlertTriangle, BarChart3, Building
} from 'lucide-react';
import { unitService, legacyApi } from '@/api/services';

/* ===================== Mock Data ===================== */
const MOCK_UNITS = [
  { id: 1, name: '万达广场商业中心', shortName: '万达广场', type: 'key', unitType: '商业综合体', address: '甘肃省兰州市城关区天水北路68号', contact: '张明华', phone: '13919881234', status: 1, hasControlRoom: true, deviceCount: 156, alarmCount: 2, onlineRate: 98.7 },
  { id: 2, name: '兰州大学第二医院', shortName: '兰大二院', type: 'key', unitType: '医院', address: '甘肃省兰州市城关区萃英门82号', contact: '李建国', phone: '13893125678', status: 1, hasControlRoom: true, deviceCount: 230, alarmCount: 0, onlineRate: 99.1 },
  { id: 3, name: '红星美凯龙家居广场', shortName: '红星美凯龙', type: 'general', unitType: '商业综合体', address: '甘肃省兰州市七里河区西津西路16号', contact: '王志强', phone: '13659321234', status: 1, hasControlRoom: false, deviceCount: 89, alarmCount: 1, onlineRate: 95.2 },
  { id: 4, name: '兰州中心写字楼', shortName: '兰州中心', type: 'general', unitType: '高层建筑', address: '甘肃省兰州市七里河区西津西路14号', contact: '陈小红', phone: '13909311234', status: 1, hasControlRoom: true, deviceCount: 178, alarmCount: 0, onlineRate: 97.5 },
  { id: 5, name: '老街坊面馆', shortName: '老街坊面馆', type: 'nine-small', unitType: '九小场所', address: '甘肃省兰州市城关区正宁路287号', contact: '赵大宝', phone: '15002668888', status: 1, hasControlRoom: false, deviceCount: 8, alarmCount: 0, onlineRate: 100 },
  { id: 6, name: '鑫源宾馆', shortName: '鑫源宾馆', type: 'nine-small', unitType: '九小场所', address: '甘肃省兰州市安宁区安宁西路159号', contact: '孙小丽', phone: '13139275678', status: 1, hasControlRoom: false, deviceCount: 12, alarmCount: 0, onlineRate: 100 },
  { id: 7, name: '中石油兰州石化公司', shortName: '兰州石化', type: 'key', unitType: '企业厂房', address: '甘肃省兰州市西固区玉门街10号', contact: '马国庆', phone: '13919198888', status: 1, hasControlRoom: true, deviceCount: 520, alarmCount: 1, onlineRate: 99.6 },
  { id: 8, name: '西北师范大学', shortName: '西北师大', type: 'key', unitType: '学校', address: '甘肃省兰州市安宁区安宁东路967号', contact: '杨文博', phone: '13609311234', status: 1, hasControlRoom: true, deviceCount: 340, alarmCount: 0, onlineRate: 98.3 },
  { id: 9, name: '小李烧烤店', shortName: '小李烧烤', type: 'nine-small', unitType: '九小场所', address: '甘肃省兰州市城关区大众巷78号', contact: '李明', phone: '18093125678', status: 1, hasControlRoom: false, deviceCount: 6, alarmCount: 0, onlineRate: 100 },
  { id: 10, name: '金辉便利店', shortName: '金辉便利店', type: 'nine-small', unitType: '九小场所', address: '甘肃省兰州市七里河区西站西路45号', contact: '周金花', phone: '13909311234', status: 1, hasControlRoom: false, deviceCount: 5, alarmCount: 0, onlineRate: 100 },
];

const typeMap: Record<string, { label: string; color: string; icon: typeof Building2 }> = {
  key: { label: '重点单位', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Factory },
  general: { label: '一般单位', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Building2 },
  'nine-small': { label: '九小场所', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Store },
};

/* ===================== Stat Card ===================== */
function StatCard({ icon: Icon, label, value, sub, accent }: { icon: typeof Building2; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-700/40 transition-all hover:scale-[1.01]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-400">{label}</div>
        <div className="text-sm font-bold text-slate-100">{value}</div>
        {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

/* ===================== Gradient Progress Bar ===================== */
function ProgressBar({ value }: { value: number }) {
  let gradient = 'from-emerald-500 to-teal-400';
  if (value < 90) gradient = 'from-amber-500 to-orange-400';
  if (value < 80) gradient = 'from-red-500 to-orange-500';
  return (
    <div className="w-full flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-300 font-medium w-8 text-right">{value}%</span>
    </div>
  );
}

/* ===================== Pulse Indicator ===================== */
function PulseIndicator({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
    </span>
  );
}

/* ===================== Wizard Step Indicator ===================== */
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: { label: string; icon: typeof Building2 }[] }) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      {steps.map((s: any, i: number) => {
        const Icon = s.icon;
        const done = i + 1 < currentStep;
        const active = i + 1 === currentStep;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                active ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]' :
                'bg-slate-800 text-slate-600 border border-slate-700'
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[9px] ${active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-600'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 rounded-full bg-slate-800 relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${done ? 'bg-emerald-500/40 w-full' : active ? 'bg-blue-500/40 w-1/2' : 'w-0'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== Main Page ===================== */
export default function UnitManagementPage() {
  const location = useLocation();
  const unitType = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/key')) return 'key';
    if (p.includes('/nine-small')) return 'nine-small';
    return 'general';
  }, [location.pathname]);

  const typeInfo = typeMap[unitType];
  const [keyword, setKeyword] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [units, setUnits] = useState(MOCK_UNITS);

  // Step 1-2 form data
  const [form, setForm] = useState({
    fullName: '', shortName: '', province: '甘肃省', city: '', district: '', street: '', address: '',
    lat: '', lng: '', unitType: '', floors: '', area: '', fireGrade: '',
    responsiblePerson: '', phone: '', backupPhone: '', maintPerson: '', maintCompany: '',
    maintStart: '', maintEnd: '', maintLevel: '', patrolCycle: '7', contractNo: '',
  });

  // Step 3 alarm config
  const [alarmConfig, setAlarmConfig] = useState({
    fireAlarm: true, faultAlarm: true, superviseAlarm: true, preAlarm: true,
    delayFilter: '30', repeatShield: '3', pushInApp: true, pushSms: true, pushCall: false,
    timeoutUpgrade: '30',
  });

  // Step 4 control room & devices
  const [hasControlRoom, setHasControlRoom] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    unitService.list().then((res: any) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.list || res.data || []);
      if (data.length > 0) {
        setUnits(data.map((u: any) => normalizeUnit(u)));
      }
    }).catch(() => {});
  }, []);

  const updateForm = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const filteredUnits = units.filter(u => {
    if (u.type !== unitType) return false;
    if (!keyword) return true;
    return u.name.includes(keyword) || u.shortName.includes(keyword) || u.address.includes(keyword);
  });

  const pageTitle = unitType === 'key' ? '重点单位' : unitType === 'nine-small' ? '九小场所' : '一般单位';
  const steps = [
    { label: '基础信息', icon: Building2 },
    { label: '维保信息', icon: FileText },
    { label: '告警策略', icon: Bell },
    { label: '消控室&设备', icon: Cpu },
    { label: '校验提交', icon: ClipboardCheck },
  ];

  const canNextStep = () => {
    if (wizardStep === 1) return form.fullName && form.shortName && form.city && form.address;
    if (wizardStep === 2) return form.responsiblePerson && form.phone && form.maintCompany;
    if (wizardStep === 3) return true;
    if (wizardStep === 4) return hasControlRoom !== null;
    return true;
  };

  const resetForm = () => setForm({
    fullName: '', shortName: '', province: '甘肃省', city: '', district: '', street: '', address: '',
    lat: '', lng: '', unitType: '', floors: '', area: '', fireGrade: '',
    responsiblePerson: '', phone: '', backupPhone: '', maintPerson: '', maintCompany: '',
    maintStart: '', maintEnd: '', maintLevel: '', patrolCycle: '7', contractNo: '',
  });

  const normalizeUnit = (u: any) => ({
    ...u,
    shortName: u.shortName || u.name || '',
    unitType: u.unitType || typeMap[u.type]?.label || u.type || '-',
    contact: u.contact || u.contactName || u.contact_name || '-',
    phone: u.phone || u.contactPhone || u.contact_phone || '-',
    deviceCount: u.deviceCount ?? 0,
    alarmCount: u.alarmCount ?? 0,
    onlineRate: u.onlineRate ?? 100,
    hasControlRoom: u.hasControlRoom ?? false,
  });

  const handleSubmit = async () => {
    try {
      const payload = {
        name: form.fullName || form.shortName,
        type: unitType,
        supervision_level: unitType,
        address: [form.province, form.city, form.district, form.street, form.address].filter(Boolean).join(''),
        contact_name: form.responsiblePerson || null,
        contact_phone: form.phone || null,
        contact_email: null,
        legal_person: null,
        license_no: null,
        area: form.area ? parseFloat(form.area) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        lat: form.lat ? parseFloat(form.lat) : null,
        risk_level: 'low',
        status: 1,
        remark: null,
      };
      const res: any = await legacyApi.createUnit(payload);
      // legacyApi.createUnit 返回的是解包后的 data ({id}), 不是 ApiResponse
      if (res && (res.id || res.code === 200)) {
        // 创建成功后直接追加到本地列表，并重新拉取全量列表确保同步
        const newUnit = normalizeUnit({
          id: res.id,
          name: form.fullName || form.shortName,
          shortName: form.shortName,
          type: unitType,
          unitType: form.unitType || (unitType === 'key' ? '重点单位' : unitType === 'nine-small' ? '九小场所' : '一般单位'),
          address: payload.address,
          contact: form.responsiblePerson || '-',
          phone: form.phone || '-',
          status: 1,
          hasControlRoom: hasControlRoom === true,
          deviceCount: devices.length,
          alarmCount: 0,
          onlineRate: 100,
        });
        setUnits(prev => [newUnit, ...prev]);
        // 异步刷新全量列表（后端已自动建表，列表接口应正常工作）
        unitService.list({ pageSize: 9999 }).then((listRes: any) => {
          const listData = listRes.data?.list || listRes.data || [];
          if (Array.isArray(listData) && listData.length > 0) {
            setUnits(listData.map(normalizeUnit));
          }
        }).catch(() => {});
        setWizardStep(6);
        setTimeout(() => { setShowWizard(false); setWizardStep(1); resetForm(); }, 2000);
      } else {
        console.error('创建单位失败:', res?.msg || res?.message || JSON.stringify(res));
        alert('创建单位失败: ' + (res?.msg || res?.message || '未知错误'));
      }
    } catch (err: any) {
      console.error('创建单位异常:', err);
      alert('创建单位异常: ' + (err?.message || '网络错误'));
    }
  };

  /* Stats */
  const stats = useMemo(() => {
    const list = filteredUnits;
    const totalDevices = list.reduce((sum, u) => sum + u.deviceCount, 0);
    const avgOnline = list.length > 0 ? (list.reduce((sum, u) => sum + u.onlineRate, 0) / list.length).toFixed(1) : '0.0';
    const totalAlarms = list.reduce((sum, u) => sum + u.alarmCount, 0);
    const controlRoomCount = list.filter(u => u.hasControlRoom).length;
    return { totalDevices, avgOnline, totalAlarms, controlRoomCount };
  }, [filteredUnits]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Building className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">{pageTitle}管理</h2>
            <p className="text-[10px] text-slate-500">联网单位信息管理</p>
          </div>
          <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</Badge>
          <span className="text-xs text-slate-500">共 {filteredUnits.length} 家</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索单位名称/地址" className="pl-8 h-8 w-56 text-xs bg-slate-800/40 backdrop-blur-sm border-slate-700/40 text-slate-200 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" />
          </div>
          <Button onClick={() => setShowWizard(true)} size="sm" className="h-8 text-xs bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm shadow-lg shadow-blue-900/20">
            <Plus className="w-3.5 h-3.5 mr-1" />新增单位
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        <StatCard
          icon={Building2}
          label="单位总数"
          value={`${filteredUnits.length} 家`}
          accent="bg-blue-500/15 text-blue-400 border border-blue-500/20"
        />
        <StatCard
          icon={BarChart3}
          label="设备总数"
          value={`${stats.totalDevices} 台`}
          accent="bg-purple-500/15 text-purple-400 border border-purple-500/20"
        />
        <StatCard
          icon={Activity}
          label="平均在线率"
          value={`${stats.avgOnline}%`}
          sub={`${stats.controlRoomCount} 家设有消控室`}
          accent="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          icon={AlertTriangle}
          label="活跃告警"
          value={`${stats.totalAlarms} 条`}
          accent="bg-amber-500/15 text-amber-400 border border-amber-500/20"
        />
      </div>

      {/* Unit List */}
      <Card className="flex-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl min-h-0 flex flex-col shadow-none">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Table Header */}
          <div className="p-2 border-b border-slate-700/30 flex-shrink-0 bg-slate-800/60 rounded-t-xl">
            <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-400 px-2 uppercase tracking-wider font-medium">
              <span className="col-span-2">单位名称</span>
              <span className="col-span-2">单位类型</span>
              <span className="col-span-3">地址</span>
              <span className="col-span-1">负责人</span>
              <span className="col-span-1">设备数</span>
              <span className="col-span-1">在线率</span>
              <span className="col-span-1">消控室</span>
              <span className="col-span-1">操作</span>
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {filteredUnits.map(unit => (
              <div key={unit.id} className="grid grid-cols-12 gap-1 p-2.5 rounded-lg border border-slate-700/20 bg-slate-800/20 hover:bg-slate-700/20 hover:border-slate-600/30 transition-all hover:scale-[1.005] items-center group">
                <span className="col-span-2 text-xs text-slate-200 font-medium truncate flex items-center gap-1.5">
                  <PulseIndicator active={unit.onlineRate >= 95} />
                  {unit.name}
                </span>
                <span className="col-span-2 text-[10px] text-slate-400">{unit.unitType}</span>
                <span className="col-span-3 text-[9px] text-slate-500 truncate">{unit.address}</span>
                <span className="col-span-1 text-[10px] text-slate-400">{unit.contact}</span>
                <span className="col-span-1 text-[10px] text-slate-400 text-center font-medium">{unit.deviceCount}</span>
                <span className="col-span-1">
                  <ProgressBar value={unit.onlineRate} />
                </span>
                <span className="col-span-1 text-center">
                  {unit.hasControlRoom
                    ? <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0">有</Badge>
                    : <Badge variant="outline" className="text-[8px] bg-slate-700/40 text-slate-500 border-slate-600/30 px-1.5 py-0">无</Badge>
                  }
                </span>
                <span className="col-span-1 flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md" aria-label="查看"><Eye className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md" aria-label="编辑"><Edit className="w-3 h-3" /></Button>
                </span>
              </div>
            ))}
            {filteredUnits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                <Search className="w-8 h-8 opacity-30" />
                <span className="text-xs">暂无数据</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===================== ADD UNIT WIZARD ===================== */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/40 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-400" />
              </div>
              新增{pageTitle}
            </DialogTitle>
          </DialogHeader>

          {wizardStep < 6 ? (
            <>
              {/* Step Indicator */}
              <StepIndicator currentStep={wizardStep} steps={steps} />

              {/* ===== STEP 1: Basic Info ===== */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">步骤 1：基础档案信息录入</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-slate-300 text-[11px]">单位全称 <span className="text-red-400">*</span></Label><Input value={form.fullName} onChange={e => updateForm('fullName', e.target.value)} placeholder="营业执照官方名称" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">单位简称 <span className="text-red-400">*</span></Label><Input value={form.shortName} onChange={e => updateForm('shortName', e.target.value)} placeholder="平台展示名称" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">所属省市</Label><Input value="甘肃省" disabled className="bg-slate-800/30 border-slate-700/30 text-slate-500 h-8 text-xs mt-0.5 rounded-lg" /></div>
                    <div><Label className="text-slate-300 text-[11px]">所属城市 <span className="text-red-400">*</span></Label>
                      <select value={form.city} onChange={e => updateForm('city', e.target.value)} className="w-full h-8 text-xs bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 text-slate-200 mt-0.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none">
                        <option value="">请选择</option><option value="兰州市">兰州市</option><option value="天水市">天水市</option><option value="白银市">白银市</option><option value="武威市">武威市</option><option value="张掖市">张掖市</option>
                      </select>
                    </div>
                    <div><Label className="text-slate-300 text-[11px]">所属区县</Label>
                      <select value={form.district} onChange={e => updateForm('district', e.target.value)} className="w-full h-8 text-xs bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 text-slate-200 mt-0.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none">
                        <option value="">请选择</option><option value="城关区">城关区</option><option value="七里河区">七里河区</option><option value="安宁区">安宁区</option><option value="西固区">西固区</option><option value="红古区">红古区</option>
                      </select>
                    </div>
                    <div><Label className="text-slate-300 text-[11px]">详细地址 <span className="text-red-400">*</span></Label><Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="街道门牌号" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">经度</Label><Input value={form.lng} onChange={e => updateForm('lng', e.target.value)} placeholder="103.840" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">纬度</Label><Input value={form.lat} onChange={e => updateForm('lat', e.target.value)} placeholder="36.067" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">单位类型</Label>
                      <select value={form.unitType} onChange={e => updateForm('unitType', e.target.value)} className="w-full h-8 text-xs bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 text-slate-200 mt-0.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none">
                        <option value="">请选择</option><option value="高层建筑">高层建筑</option><option value="商业综合体">商业综合体</option><option value="工业园区">工业园区</option><option value="医院">医院</option><option value="学校">学校</option><option value="企业厂房">企业厂房</option><option value="九小场所">九小场所</option>
                      </select>
                    </div>
                    <div><Label className="text-slate-300 text-[11px]">建筑层数</Label><Input value={form.floors} onChange={e => updateForm('floors', e.target.value)} placeholder="地上/地下层数" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">建筑面积(㎡)</Label><Input value={form.area} onChange={e => updateForm('area', e.target.value)} placeholder="建筑面积" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">消防验收等级</Label>
                      <select value={form.fireGrade} onChange={e => updateForm('fireGrade', e.target.value)} className="w-full h-8 text-xs bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 text-slate-200 mt-0.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none">
                        <option value="">请选择</option><option value="一级">一级</option><option value="二级">二级</option><option value="三级">三级</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1"><MapPin className="w-3 h-3" />GIS地图预览</div>
                    <div className="h-24 rounded-lg bg-slate-800/50 border border-slate-700/30 flex items-center justify-center">
                      <span className="text-[10px] text-slate-600">{form.lat && form.lng ? `经纬度: ${form.lng}, ${form.lat}` : '请输入经纬度坐标以在地图上定位'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Contact & Maint ===== */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">步骤 2：负责人 & 维保合同信息</div>
                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium"><User className="w-3 h-3" />负责人 & 联络信息</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-slate-300 text-[11px]">消防安全责任人 <span className="text-red-400">*</span></Label><Input value={form.responsiblePerson} onChange={e => updateForm('responsiblePerson', e.target.value)} placeholder="姓名" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">紧急联系电话 <span className="text-red-400">*</span></Label><Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="手机号" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">备用告警手机号</Label><Input value={form.backupPhone} onChange={e => updateForm('backupPhone', e.target.value)} placeholder="备用接收手机号" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">维保对接人</Label><Input value={form.maintPerson} onChange={e => updateForm('maintPerson', e.target.value)} placeholder="维保公司对接人" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div className="col-span-2"><Label className="text-slate-300 text-[11px]">维保公司归属 <span className="text-red-400">*</span></Label><Input value={form.maintCompany} onChange={e => updateForm('maintCompany', e.target.value)} placeholder="维保服务公司名称" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium"><FileText className="w-3 h-3" />维保合同信息</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-slate-300 text-[11px]">服务起始日期</Label><Input type="date" value={form.maintStart} onChange={e => updateForm('maintStart', e.target.value)} className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">服务截止日期</Label><Input type="date" value={form.maintEnd} onChange={e => updateForm('maintEnd', e.target.value)} className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">维保等级</Label>
                      <select value={form.maintLevel} onChange={e => updateForm('maintLevel', e.target.value)} className="w-full h-8 text-xs bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 text-slate-200 mt-0.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none">
                        <option value="">请选择</option><option value="一级维保">一级维保</option><option value="二级维保">二级维保</option><option value="三级维保">三级维保</option>
                      </select>
                    </div>
                    <div><Label className="text-slate-300 text-[11px]">巡检周期(天)</Label><Input value={form.patrolCycle} onChange={e => updateForm('patrolCycle', e.target.value)} placeholder="7" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div className="col-span-2"><Label className="text-slate-300 text-[11px]">合同编号</Label><Input value={form.contractNo} onChange={e => updateForm('contractNo', e.target.value)} placeholder="维保合同编号归档" className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                  </div>
                </div>
              )}

              {/* ===== STEP 3: Alarm Config ===== */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">步骤 3：平台权限与告警策略配置</div>
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium"><Shield className="w-3 h-3" />数据隔离权限（自动配置）</div>
                    <div className="text-[9px] text-slate-500 mt-1 ml-4">该单位下级管理员仅可查看本单位设备、告警、数据，无权查看其他单位信息</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium"><Bell className="w-3 h-3" />告警推送开关</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ key: 'fireAlarm' as const, label: '火警推送' }, { key: 'faultAlarm' as const, label: '故障推送' }, { key: 'superviseAlarm' as const, label: '监管推送' }, { key: 'preAlarm' as const, label: '预警推送' }].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 transition-all">
                        <span className="text-[11px] text-slate-300">{item.label}</span>
                        <Switch checked={alarmConfig[item.key]} onCheckedChange={v => setAlarmConfig(p => ({ ...p, [item.key]: v }))} />
                      </div>
                    ))}
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/15 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[10px] text-purple-400 font-medium"><Settings className="w-3 h-3" />推送规则配置</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-slate-300 text-[11px]">告警延时过滤(秒)</Label><Input value={alarmConfig.delayFilter} onChange={e => setAlarmConfig(p => ({ ...p, delayFilter: e.target.value }))} className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">重复屏蔽阈值(次)</Label><Input value={alarmConfig.repeatShield} onChange={e => setAlarmConfig(p => ({ ...p, repeatShield: e.target.value }))} className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                    <div><Label className="text-slate-300 text-[11px]">超时升级(分钟)</Label><Input value={alarmConfig.timeoutUpgrade} onChange={e => setAlarmConfig(p => ({ ...p, timeoutUpgrade: e.target.value }))} className="bg-slate-800/50 border-slate-700/40 text-slate-200 h-8 text-xs mt-0.5 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[{ key: 'pushInApp' as const, label: '站内提醒' }, { key: 'pushSms' as const, label: '短信告警' }, { key: 'pushCall' as const, label: '电话告警' }].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 transition-all">
                        <span className="text-[11px] text-slate-300">{item.label}</span>
                        <Switch checked={alarmConfig[item.key]} onCheckedChange={v => setAlarmConfig(p => ({ ...p, [item.key]: v }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== STEP 4: Control Room & Devices ===== */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">步骤 4：消控室配置 & 设备绑定</div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 backdrop-blur-sm">
                    <Label className="text-slate-300 text-[11px] block mb-2">该单位是否设有消防控制室？ <span className="text-red-400">*</span></Label>
                    <div className="flex gap-3">
                      <button onClick={() => setHasControlRoom(true)} className={`flex-1 p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${hasControlRoom === true ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]' : 'border-slate-600/30 bg-slate-800/20 text-slate-500 hover:border-slate-500/50 hover:bg-slate-700/20'}`}>
                        <Monitor className="w-5 h-5" /><span className="text-[11px] font-medium">有消控室</span>
                        <span className="text-[8px] text-slate-500">自动在数智消控室生成标签</span>
                      </button>
                      <button onClick={() => setHasControlRoom(false)} className={`flex-1 p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${hasControlRoom === false ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.1)]' : 'border-slate-600/30 bg-slate-800/20 text-slate-500 hover:border-slate-500/50 hover:bg-slate-700/20'}`}>
                        <Radio className="w-5 h-5" /><span className="text-[11px] font-medium">无消控室</span>
                        <span className="text-[8px] text-slate-500">绑定物联网传感器设备</span>
                      </button>
                    </div>
                  </div>

                  {hasControlRoom === true && (
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400"><Check className="w-3.5 h-3.5" />已选择"有消控室"</div>
                      <div className="text-[9px] text-slate-500 mt-1">创建后该单位将在【数智消控室】界面自动生成标签栏，点击进入控制界面。</div>
                    </div>
                  )}

                  {hasControlRoom === false && (
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/15 backdrop-blur-sm">
                        <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium"><Cpu className="w-3 h-3" />物联网设备绑定</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['NB烟感探测器', '温感探测器', '水压液位仪', '漏电探测器', '防排烟风机', '声光报警器', '手动报警按钮', '消防栓按钮'].map(device => {
                          const checked = devices.includes(device);
                          return (
                            <div key={device} onClick={() => setDevices(prev => checked ? prev.filter(d => d !== device) : [...prev, device])}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${checked ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-700/30 bg-slate-800/20 hover:bg-slate-700/20'}`}>
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={`text-[10px] ${checked ? 'text-blue-300' : 'text-slate-400'}`}>{device}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-700/40 bg-slate-800/20 cursor-pointer hover:bg-slate-700/20 transition-all">
                        <Upload className="w-3.5 h-3.5 text-slate-500" /><span className="text-[10px] text-slate-500">支持 Excel 批量导入多台设备</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== STEP 5: Review & Submit ===== */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">步骤 5：信息校验与提交</div>
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 backdrop-blur-sm space-y-2 max-h-64 overflow-y-auto">
                    <div className="text-[10px] text-slate-400 font-medium">基础信息</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-slate-500">单位全称:</span><span className="text-slate-200">{form.fullName || '-'}</span>
                      <span className="text-slate-500">单位简称:</span><span className="text-slate-200">{form.shortName || '-'}</span>
                      <span className="text-slate-500">地址:</span><span className="text-slate-200">甘肃省{form.city}{form.district}{form.address}</span>
                      <span className="text-slate-500">类型:</span><span className="text-slate-200">{form.unitType || '-'}</span>
                    </div>
                    <div className="border-t border-slate-700/30 pt-1 mt-1" />
                    <div className="text-[10px] text-slate-400 font-medium">负责人 & 维保</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-slate-500">责任人:</span><span className="text-slate-200">{form.responsiblePerson || '-'}</span>
                      <span className="text-slate-500">联系电话:</span><span className="text-slate-200">{form.phone || '-'}</span>
                      <span className="text-slate-500">维保公司:</span><span className="text-slate-200">{form.maintCompany || '-'}</span>
                    </div>
                    <div className="border-t border-slate-700/30 pt-1 mt-1" />
                    <div className="text-[10px] text-slate-400 font-medium">消控室 & 设备</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-slate-500">消控室:</span><span className="text-slate-200">{hasControlRoom === true ? '有' : hasControlRoom === false ? '无' : '-'}</span>
                      {!hasControlRoom && <><span className="text-slate-500">绑定设备:</span><span className="text-slate-200">{devices.length > 0 ? devices.join('、') : '未选择'}</span></>}
                    </div>
                  </div>
                  {/* Validation checks */}
                  <div className="space-y-1">
                    {[
                      { label: '重名校验', pass: form.fullName.length > 0 },
                      { label: '手机号格式校验', pass: /^1[3-9]\d{9}$/.test(form.phone) },
                      { label: '地址信息完整性', pass: !!form.city && !!form.address },
                      { label: '维保信息校验', pass: !!form.maintCompany && !!form.responsiblePerson },
                      { label: '消控室选项', pass: hasControlRoom !== null },
                    ].map((check: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        {check.pass ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                        <span className={check.pass ? 'text-emerald-400' : 'text-red-400'}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wizard Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                <Button variant="outline" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowWizard(false)} className="h-8 text-xs border-slate-700/50 text-slate-300 hover:bg-slate-700/40 hover:border-slate-600/50 rounded-lg" aria-label="上一页">
                  {wizardStep > 1 ? <><ChevronLeft className="w-3 h-3 mr-0.5" />上一步</> : '取消'}
                </Button>
                {wizardStep < 5 ? (
                  <Button onClick={() => setWizardStep(wizardStep + 1)} disabled={!canNextStep()} className="h-8 text-xs bg-blue-600/90 hover:bg-blue-700 disabled:opacity-30 rounded-lg shadow-lg shadow-blue-900/20">
                    下一步<ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} className="h-8 text-xs bg-emerald-600/90 hover:bg-emerald-700 rounded-lg shadow-lg shadow-emerald-900/20">
                    <Check className="w-3 h-3 mr-0.5" />提交创建
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Step 6: Success */
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-slate-100">单位创建成功</div>
              <div className="text-xs text-slate-400 mt-1 text-center">单位已正式录入平台数据库<br />全平台数据联动已自动生效</div>
              <div className="mt-3 text-[9px] text-slate-500 text-center space-y-0.5">
                <div>大屏统计已更新 | GIS点位已生成</div>
                <div>维保台账已创建 | 巡检任务已下发</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
