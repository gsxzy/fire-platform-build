import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wifi, AlertTriangle, Wrench } from 'lucide-react';

export default function StatCards({ stats }: { stats: { total: number; online: number; alarm: number; fault: number } }) {
  return (
    <div className="flex items-center gap-3">
      <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
        <CardContent className="px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 text-xs">单位总数</span>
            <Badge className="ml-2 bg-blue-600">{stats.total}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
        <CardContent className="px-4 py-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-slate-400 text-xs">在线</span>
            <Badge className="ml-2 bg-green-600">{stats.online}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
        <CardContent className="px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-slate-400 text-xs">告警</span>
            <Badge className="ml-2 bg-red-600">{stats.alarm}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900/90 backdrop-blur-md border-slate-700">
        <CardContent className="px-4 py-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-xs">故障</span>
            <Badge className="ml-2 bg-yellow-600">{stats.fault}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
