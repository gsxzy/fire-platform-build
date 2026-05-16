/**
 * 设备管理五环节导航（与 ModuleRegistry / 后端 lifecycle 一致）
 * 入库管理 → 设备接入 → 设备分配 → 设备配置 → 设备维护
 */
import { Link } from 'react-router';
import { Package, Cable, Server, Settings, Wrench, ChevronRight } from 'lucide-react';

export type DeviceManagementFlowStep = 'archive' | 'access' | 'allocate' | 'config' | 'maintain';

const steps: { id: DeviceManagementFlowStep; path: string; label: string; Icon: typeof Package }[] = [
  { id: 'archive', path: '/device/archive', label: '入库管理', Icon: Package },
  { id: 'access', path: '/device/access', label: '设备接入', Icon: Cable },
  { id: 'allocate', path: '/device/allocate', label: '设备分配', Icon: Server },
  { id: 'config', path: '/device/config', label: '设备配置', Icon: Settings },
  { id: 'maintain', path: '/device/maintain', label: '设备维护', Icon: Wrench },
];

export function DeviceManagementFlowHint({ active }: { active: DeviceManagementFlowStep }) {
  return (
    <nav
      className="glass rounded-lg border border-slate-600/40 px-2.5 py-1.5 flex flex-wrap items-center gap-y-1 gap-x-0.5 text-[10px]"
      aria-label="设备管理流程"
    >
      {steps.map((s, i) => (
        <span key={s.id} className="inline-flex items-center">
          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600 mx-0.5 flex-shrink-0" aria-hidden />}
          <Link
            to={s.path}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
              active === s.id
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/35'
                : 'text-slate-400 border-transparent hover:bg-slate-700/60 hover:text-slate-200'
            }`}
          >
            <s.Icon className="w-3 h-3 flex-shrink-0 opacity-90" aria-hidden />
            {s.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
