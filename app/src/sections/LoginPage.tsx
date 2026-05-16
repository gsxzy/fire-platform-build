import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/types/api';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Activity, Building2, Cpu, Bell, Zap, Lock, User, Fingerprint, type LucideIcon } from 'lucide-react';

/* Animated Particle Background */
function ParticleBackground() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 12 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.08 + Math.random() * 0.25,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px rgba(59,130,246,0.3)`,
            animation: `float ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      {/* Radial gradient center glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />

    </div>
  );
}

/* Radar Scan Effect */
function RadarScan() {
  return (
    <div className="absolute right-10 top-10 w-64 h-64 opacity-[0.06] pointer-events-none hidden xl:block">
      <div className="relative w-full h-full rounded-full border border-blue-500/30">
        <div className="absolute inset-4 rounded-full border border-blue-500/20" />
        <div className="absolute inset-8 rounded-full border border-blue-500/10" />
        <div className="absolute inset-12 rounded-full border border-blue-500/10" />
        <div className="absolute inset-0 rounded-full" style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(59,130,246,0.3) 60deg, transparent 120deg)',
          animation: 'radar-spin 4s linear infinite',
        }} />
      </div>

    </div>
  );
}

/* Stats Counter Animation */
function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

/* Login Page */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [publicStats, setPublicStats] = useState({ unitCount: 0, onlineDevices: 0, alarmPending: 0 });

  // 已登录时自动跳转（优先跳转到 redirect 参数指定的页面）
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        try {
          const decoded = decodeURIComponent(redirect);
          // 确保 redirect 以 / 开头，防止外部链接攻击
          if (decoded.startsWith('/')) {
            navigate(decoded, { replace: true });
            return;
          }
        } catch { /* ignore invalid redirect */ }
      }
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  // 加载公开统计数据（供登录页展示真实平台概览）
  useEffect(() => {
    api.get<{ unitCount: number; onlineDevices: number; alarmPending: number }>('/public/stats')
      .then(res => {
        if (res.code === 200 && res.data) {
          setPublicStats({
            unitCount: Number(res.data.unitCount) || 0,
            onlineDevices: Number(res.data.onlineDevices) || 0,
            alarmPending: Number(res.data.alarmPending) || 0,
          });
        }
      })
      .catch(() => { /* 静默失败，保持默认值 0 */ });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      // 跳转由 useEffect 监听 isAuthenticated 自动处理，避免状态不同步
    } catch (err: unknown) {
      setError(getErrorMessage(err, '登录失败'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060a14 0%, #0a0e1a 30%, #0f172a 70%, #111827 100%)' }}>
      
      <ParticleBackground />
      <RadarScan />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-blue-500/10 rounded-bl-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-blue-500/10 rounded-tr-3xl pointer-events-none" />

      <div className="w-full max-w-5xl px-6 flex items-center gap-12 relative z-10">
        {/* Left Side - Brand Info */}
        <div className="flex-1 hidden lg:block animate-slide-in-right">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center">
              <img src="/logo.png" alt="新致远" className="w-14 h-14 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider">新致远智慧消防</h1>
              <p className="text-slate-400 text-sm mt-1">XinZhiYuan Smart Fire Protection</p>
            </div>
          </div>
          
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            基于物联网、大数据和人工智能技术的城市级智慧消防远程监控平台，实现火灾预警、设备监控、维保管理的全方位智能化管理。
          </p>

          <div className="grid grid-cols-3 gap-4">
            {([
              { icon: Building2, label: '联网单位', value: publicStats.unitCount, suffix: '家', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { icon: Cpu, label: '在线设备', value: publicStats.onlineDevices, suffix: '台', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { icon: Bell, label: '待处理告警', value: publicStats.alarmPending, suffix: '条', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            ] as const satisfies ReadonlyArray<{ icon: LucideIcon; label: string; value: number; suffix: string; color: string; bg: string; border: string }>).map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={`${stat.bg} border ${stat.border} rounded-xl p-4 hover:scale-[1.03] transition-all duration-300 backdrop-blur-sm`}>
                  <Icon className={`w-6 h-6 ${stat.color} mb-2`} />
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">系统运行正常</span>
            </span>
            <span>|</span>
            <span>版本 V2.0.0</span>
            <span>|</span>
            <span>© 2026 新致远科技</span>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex items-center justify-center mx-auto mb-3">
              <img src="/logo.png" alt="新致远" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white">新致远智慧消防</h1>
            <p className="text-slate-400 text-sm">远程监控中心平台</p>
          </div>

          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-50" />
            
            <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-6 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
                  <Fingerprint className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">安全登录</h2>
                <p className="text-xs text-slate-500 mt-1">请输入您的账号和密码进入系统</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> 用户名
                  </Label>
                  <div className={`relative rounded-lg transition-all duration-200 ${focusedField === 'username' ? 'ring-2 ring-blue-500/20' : ''}`}>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="请输入用户名"
                      className="h-11 text-sm bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-0 pl-10"
                      required
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> 密码
                    </Label>
                    <button type="button" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">忘记密码?</button>
                  </div>
                  <div className={`relative rounded-lg transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-blue-500/20' : ''}`}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="请输入密码"
                      className="h-11 text-sm bg-slate-900/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 pr-10 pl-10 focus:border-blue-500/50 focus:ring-0"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 px-3 py-2.5 rounded-lg border border-red-500/20 animate-shake">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      登录中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      登 录
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-700/30">
                {import.meta.env.DEV && (
                  <>
                    <p className="text-[10px] text-slate-500 text-center mb-2">演示账号（仅开发环境）</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setUsername('admin'); setPassword('__dev_pass__'); }} className="flex-1 py-1.5 text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700/30 rounded-lg hover:bg-slate-700/40 hover:border-slate-600/40 transition-all">
                        管理员: admin
                      </button>
                      <button onClick={() => { setUsername('operator'); setPassword('__dev_pass__'); }} className="flex-1 py-1.5 text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700/30 rounded-lg hover:bg-slate-700/40 hover:border-slate-600/40 transition-all">
                        操作员: operator
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
