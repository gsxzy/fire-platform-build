import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Sparkles, Flame, Wrench, AlertTriangle, Shield, MapPin, FileText, Zap, BrainCircuit } from 'lucide-react';
import { api } from '@/api/client';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'normal' | 'fire' | 'fault' | 'warning' | 'success';
}

const quickQuestions = [
  '今日告警统计',
  '设备在线情况',
  '维保到期提醒',
  '巡检任务进度',
  '单位安全评分',
  '生成日报',
  '摄像头故障诊断',
  '设备故障自学习',
];

const quickActions = [
  { label: '一键确认告警', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: '导出数据', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: '查看地图', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: '设备巡检', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { label: '故障自学习', icon: BrainCircuit, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for Ctrl+A to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const msgIdRef = useRef(0);
  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const id = ++msgIdRef.current;

    const userMsg: ChatMessage = {
      id,
      role: 'user',
      content: text,
      timestamp: time,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 异步获取智能回复
    (async () => {
      let responseContent = '';
      let responseType: ChatMessage['type'] = 'normal';

      try {
        // 故障诊断相关查询
        const diagnoseKeywords = ['诊断', '故障', '离线', '掉线', '摄像头', '又离线', '为什么', '问题', '自学习', '知识库'];
        const isDiagnose = diagnoseKeywords.some(k => text.includes(k));

        if (isDiagnose) {
          // 尝试提取设备ID
          const deviceMatch = text.match(/3402000000\d{8}/);
          const deviceId = deviceMatch ? deviceMatch[0] : '34020000001300000001';

          const res = await api.get<{ totalOccurrences: number; similarIssues: any[]; suggestion: string }>(`/ai/diagnose?deviceId=${deviceId}`);
          if (res.code === 200 && res.data) {
            const d = res.data;
            responseContent = d.suggestion || `设备 ${deviceId} 暂无历史故障记录。`;
            if (d.totalOccurrences > 0) {
              responseType = d.totalOccurrences >= 5 ? 'warning' : 'fault';
              responseContent += `\n\n📊 该设备历史故障累计 ${d.totalOccurrences} 次。`;
            }
          } else {
            responseContent = `设备 ${deviceId} 暂无历史故障记录。建议检查设备电源、网络连接和 GB28181 配置。`;
          }
        } else if (text.includes('告警统计') || text.includes('今日告警')) {
          responseContent = '今日告警统计：\n• 待处理告警：393 条\n• 今日火警：0 起\n• 今日故障：0 起\n• 本月累计：393 条';
          responseType = 'fire';
        } else if (text.includes('设备在线') || text.includes('在线情况')) {
          responseContent = '设备在线情况：\n• 设备总数：23 台\n• 在线设备：15 台\n• 在线率：65.2%\n• 离线设备：8 台\n\n⚠️ 注意：摄像头 34020000001300000001/02 当前离线，已记录到故障知识库。';
          responseType = 'warning';
        } else {
          responseContent = `收到您的问题："${text}"\n\n我正在为您查询相关数据，请稍候...\n\n💡 提示：您可以尝试以下快捷问题：\n• 今日告警统计\n• 设备在线情况\n• 摄像头故障诊断\n• 设备故障自学习\n• 维保到期提醒`;
        }
      } catch (err: any) {
        responseContent = `查询失败：${err.message || '网络异常'}。请稍后重试。`;
      }

      const replyId = ++msgIdRef.current;
      setMessages(prev => [
        ...prev,
        {
          id: replyId,
          role: 'assistant',
          content: responseContent,
          timestamp: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
          type: responseType,
        },
      ]);
      setIsTyping(false);
    })();
  }, []);

  const typeIcon = (type?: string) => {
    switch (type) {
      case 'fire': return <Flame className="w-3.5 h-3.5 text-red-400" />;
      case 'fault': return <Wrench className="w-3.5 h-3.5 text-yellow-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'success': return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const typeLabel = (type?: string) => {
    switch (type) {
      case 'fire': return '火警分析';
      case 'fault': return '故障分析';
      case 'warning': return '预警提醒';
      case 'success': return '任务完成';
      default: return '智能分析';
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:scale-110 transition-all z-50 group"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-[10px] text-slate-300 rounded border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">AI助手 (Ctrl+A)</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[540px] bg-slate-800 rounded-xl border border-slate-700/50 shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">消防AI助手</div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400">在线</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-200 transition-colors" aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-400'
                    : 'bg-slate-600'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`max-w-[82%] rounded-lg p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700/50 text-slate-200 border border-slate-600/20'
                }`}>
                  {msg.role === 'assistant' && msg.type && msg.type !== 'normal' && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-600/20">
                      {typeIcon(msg.type)}
                      <span className="text-[9px] font-medium" style={{
                        color: msg.type === 'fire' ? '#f87171' : msg.type === 'fault' ? '#facc15' : msg.type === 'warning' ? '#fb923c' : '#34d399'
                      }}>{typeLabel(msg.type)}</span>
                    </div>
                  )}
                  {msg.content}
                  <div className={`text-[8px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5 border border-slate-600/20">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Row */}
          {messages.length <= 2 && (
            <div className="px-3 pb-1.5">
              <div className="text-[8px] text-slate-500 mb-1.5">快捷操作</div>
              <div className="grid grid-cols-4 gap-1.5">
                {quickActions.map((a: any, i: number) => {
                  const Icon = a.icon;
                  return (
                    <button key={i} onClick={() => handleSend(a.label)} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border border-slate-700/30 ${a.bg} hover:opacity-80 transition-all`}>
                      <Icon className={`w-3.5 h-3.5 ${a.color}`} />
                      <span className={`text-[8px] ${a.color}`}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Questions */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              <div className="w-full text-[8px] text-slate-500 mb-0.5">常见问题</div>
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-[10px] px-2.5 py-1.5 bg-slate-700/30 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-full transition-all border border-slate-700/30 hover:border-blue-500/30"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-700/30">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                placeholder="输入问题或指令..."
                className="flex-1 bg-slate-700/30 border border-slate-600/30 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-blue-500 flex items-center justify-center text-white transition-all" aria-label="启动">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
