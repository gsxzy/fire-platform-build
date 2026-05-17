import { useState, useEffect } from 'react';
import { iotService } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import EmptyState from '@/components/EmptyState';
import {
  Workflow, ChevronRight, Database, HardDrive, Bell,
  CheckCircle, ArrowRight, Cpu, Radio, BarChart3, Zap, Settings
} from 'lucide-react';

interface PipelineStats {
  rawPackets: number;
  parsed: number;
  dropped: number;
  kafkaPublished: number;
  influxWritten: number;
  pgUpdated: number;
  avgLatency: string;
  throughput: string;
}

export default function DataPipelinePage() {
  const [liveStats, setLiveStats] = useState<PipelineStats>({
    rawPackets: 0, parsed: 0, dropped: 0,
    kafkaPublished: 0, influxWritten: 0, pgUpdated: 0,
    avgLatency: '--', throughput: '--',
  });
  const [kafkaTopics, setKafkaTopics] = useState<any[]>([]);
  const [influxMetrics, setInfluxMetrics] = useState<any[]>([]);
  const [pgTables, setPgTables] = useState<any[]>([]);
  const [linkageModules, setLinkageModules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'kafka' | 'influx' | 'pg'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await iotService.pipelineList() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (data.stats) setLiveStats(prev => ({ ...prev, ...data.stats }));
        if (Array.isArray(data.kafkaTopics)) setKafkaTopics(data.kafkaTopics);
        if (Array.isArray(data.influxMetrics)) setInfluxMetrics(data.influxMetrics);
        if (Array.isArray(data.pgTables)) setPgTables(data.pgTables);
        if (Array.isArray(data.linkageModules)) setLinkageModules(data.linkageModules);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <DataContainer loading={loading} error={error} data={kafkaTopics} onRetry={loadData} emptyText="暂无数据">
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Workflow className="w-4 h-4 text-blue-400" />
        <span>IoT接入层</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">数据流转管道</span>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2"><Workflow className="w-4 h-4 text-blue-400" />数据流转链路</h3>
          <span className="text-[10px] text-slate-500">实时 throughput: <span className="text-emerald-400 font-mono">{liveStats.throughput}</span></span>
        </div>

        {/* Pipeline Flow */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { label: '设备采集', icon: Cpu, color: 'blue', value: (liveStats.rawPackets || 0).toLocaleString() + ' 报文' },
            { label: '协议解析', icon: Zap, color: 'purple', value: (liveStats.parsed || 0).toLocaleString() + ' 已解析' },
            { label: '数据清洗', icon: Settings, color: 'indigo', value: '丢弃 ' + (liveStats.dropped || 0) },
            { label: 'Kafka', icon: Radio, color: 'orange', value: (liveStats.kafkaPublished || 0).toLocaleString() + ' 事件' },
            { label: 'InfluxDB', icon: Database, color: 'cyan', value: (liveStats.influxWritten ? (liveStats.influxWritten / 1000000).toFixed(0) + 'M' : '--') + ' 点位' },
            { label: 'PostgreSQL', icon: HardDrive, color: 'green', value: (liveStats.pgUpdated ? (liveStats.pgUpdated / 1000).toFixed(0) + 'K' : '--') + ' 记录' },
          ].map((node: any, i: number) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex-1 p-2.5 rounded-lg border text-center" style={{ borderColor: `var(--${node.color}-500, #3b82f6)`, background: `${node.color === 'blue' ? 'rgba(59,130,246,0.05)' : node.color === 'purple' ? 'rgba(168,85,247,0.05)' : node.color === 'indigo' ? 'rgba(99,102,241,0.05)' : node.color === 'orange' ? 'rgba(249,115,22,0.05)' : node.color === 'cyan' ? 'rgba(6,182,212,0.05)' : 'rgba(34,197,94,0.05)'}` }}>
                <node.icon className="w-4 h-4 mx-auto mb-1" style={{ color: node.color === 'blue' ? '#3b82f6' : node.color === 'purple' ? '#a855f7' : node.color === 'indigo' ? '#6366f1' : node.color === 'orange' ? '#f97316' : node.color === 'cyan' ? '#06b6d4' : '#22c55e' }} />
                <div className="text-[9px] font-medium text-slate-200">{node.label}</div>
                <div className="text-[8px] text-slate-500 font-mono mt-0.5">{node.value}</div>
              </div>
              {i < 5 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Latency Bar */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-500">端到端延迟</span>
          <div className="flex-1 h-2 bg-slate-700/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" style={{ width: '12%' }} />
          </div>
          <span className="text-emerald-400 font-mono">{liveStats.avgLatency}</span>
          <span className="text-slate-500">p99: --</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-slate-700/30">
        {[
          { key: 'overview' as const, label: '总览', icon: BarChart3 },
          { key: 'kafka' as const, label: 'Kafka事件', icon: Radio },
          { key: 'influx' as const, label: 'InfluxDB时序', icon: Database },
          { key: 'pg' as const, label: 'PostgreSQL业务', icon: HardDrive },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 text-[10px] rounded-md transition-all flex items-center gap-1 ${activeTab === t.key ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><t.icon className="w-3 h-3" />{t.label}</button>
        ))}
      </div>

      {activeTab === 'kafka' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
          <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
            <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2"><Radio className="w-4 h-4 text-orange-400" />Kafka Topic监控</h3>
          </div>
          {kafkaTopics.length > 0 ? (
            <table className="w-full"><thead><tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
              <th className="text-left p-2.5">Topic名称</th><th className="text-left p-2.5">分区</th><th className="text-left p-2.5">消息/秒</th><th className="text-left p-2.5">堆积</th><th className="text-left p-2.5">消费者</th><th className="text-left p-2.5">状态</th>
            </tr></thead><tbody className="text-[10px]">
              {kafkaTopics.map((t: any) => (
                <tr key={t.name} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                  <td className="p-2.5 text-slate-200 font-mono">{t.name}</td>
                  <td className="p-2.5 text-slate-400">{t.partitions}</td>
                  <td className="p-2.5 text-orange-400">{t.messagesPerSec}/s</td>
                  <td className="p-2.5"><span className={t.lag > 100 ? 'text-red-400' : t.lag > 10 ? 'text-yellow-400' : 'text-emerald-400'}>{t.lag}</span></td>
                  <td className="p-2.5 text-slate-400">{t.consumers}</td>
                  <td className="p-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded ${t.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{t.status === 'healthy' ? '正常' : '告警'}</span></td>
                </tr>
              ))}
            </tbody></table>
          ) : (
            <div className="p-8"><EmptyState type="data" title="暂无Kafka数据" description="后端未返回Kafka监控数据" /></div>
          )}
        </div>
      )}

      {activeTab === 'influx' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
          <div className="p-3 border-b border-slate-700/30">
            <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2"><Database className="w-4 h-4 text-cyan-400" />InfluxDB 时序数据存储</h3>
          </div>
          {influxMetrics.length > 0 ? (
            <table className="w-full"><thead><tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
              <th className="text-left p-2.5">Measurement</th><th className="text-left p-2.5">数据点</th><th className="text-left p-2.5">保留策略</th><th className="text-left p-2.5">最后写入</th><th className="text-left p-2.5">写入速率</th>
            </tr></thead><tbody className="text-[10px]">
              {influxMetrics.map((m: any) => (
                <tr key={m.measurement} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                  <td className="p-2.5 text-slate-200 font-mono">{m.measurement}</td>
                  <td className="p-2.5 text-cyan-400">{m.points?.toLocaleString()}</td>
                  <td className="p-2.5 text-slate-400">{m.retention}</td>
                  <td className="p-2.5 text-slate-500 font-mono">{m.lastWrite}</td>
                  <td className="p-2.5 text-emerald-400">{m.writeRate} pt/s</td>
                </tr>
              ))}
            </tbody></table>
          ) : (
            <div className="p-8"><EmptyState type="data" title="暂无InfluxDB数据" description="后端未返回时序数据库监控数据" /></div>
          )}
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'pg') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
            <h3 className="text-xs font-medium text-slate-200 mb-3 flex items-center gap-2"><HardDrive className="w-4 h-4 text-emerald-400" />PostgreSQL 业务数据同步</h3>
            {pgTables.length > 0 ? (
              <div className="space-y-2">
                {pgTables.map((t: any) => (
                  <div key={t.table} className="flex items-center justify-between p-2 bg-slate-700/20 rounded">
                    <div><div className="text-[10px] text-slate-200 font-mono">{t.table}</div><div className="text-[8px] text-slate-500">{t.desc}</div></div>
                    <div className="text-right"><div className="text-[10px] text-emerald-400">{t.records?.toLocaleString()}</div><div className="text-[8px] text-slate-500 font-mono">{t.lastSync}</div></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="data" title="暂无同步数据" description="后端未返回PostgreSQL同步状态" />
            )}
          </div>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
            <h3 className="text-xs font-medium text-slate-200 mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-red-400" />业务联动触发</h3>
            {linkageModules.length > 0 ? (
              <div className="space-y-2">
                {linkageModules.map((m: any) => (
                  <div key={m.module} className="flex items-center justify-between p-2 bg-slate-700/20 rounded">
                    <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><div><div className="text-[10px] text-slate-200">{m.module}</div><div className="text-[8px] text-slate-500">{m.trigger}</div></div></div>
                    <div className="text-right"><div className="text-[9px] text-emerald-400">{m.count?.toLocaleString()}</div><div className="text-[7px] text-slate-500">次触发</div></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState type="data" title="暂无联动数据" description="后端未返回业务联动触发数据" />
            )}
          </div>
        </div>
      )}
    </div>
    </DataContainer>
  );
}
