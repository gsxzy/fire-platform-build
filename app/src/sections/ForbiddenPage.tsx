import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4 text-slate-400 px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-lg font-medium text-slate-200">无访问权限</h2>
      <p className="text-sm text-center max-w-md">
        当前账号没有访问此页面的权限。请联系管理员分配角色权限，或返回工作台。
      </p>
      <Button
        variant="outline"
        size="sm"
        className="border-slate-600 text-slate-300"
        onClick={() => navigate('/workbench')}
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        返回工作台
      </Button>
    </div>
  );
}
