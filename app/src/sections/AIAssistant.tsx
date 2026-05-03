import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Sparkles, Flame, Wrench, AlertTriangle, Shield, MapPin, FileText, Zap } from 'lucide-react';

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
];

const quickActions = [
  { label: '一键确认告警', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: '导出数据', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: '查看地图', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: '设备巡检', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

const aiResponses: Record<string, { content: string; type?: 'normal' | 'fire' | 'fault' | 'warning' | 'success' }> = {
  '今日告警统计': {
    content: `📊 今日告警统计（截至当前时间）

┌──────────┬──────┬────────┐
│ 告警类型  │ 数量  │ 环比     │
├──────────┼──────┼────────┤
│ 🔥 火警   │  3   │  ↓ 25% │
│ ⚠️ 故障   │ 12   │  ↑ 20% │
│ 💧 预警   │  8   │  ↓ 11% │
│ 📢 监管   │  2   │   --   │
├──────────┼──────┼────────┤
│ 📝 合计   │ 25   │  ↓ 5%  │
└──────────┴──────┴────────┘

✅ 已处理：20起
⏳ 待处理：5起

⚡ 建议：万达广场故障较多，建议安排维保人员优先处理。`,
    type: 'fire',
  },
  '设备在线情况': {
    content: `🔌 设备在线情况总览

在线设备：3,256 / 3,298
在线率：98.7%

📍 离线设备分布：
• 万达广场 — 8台离线
• 兰州中心 — 6台离线
• 红星美凯龙 — 5台离线
• 兰大二院 — 3台离线
• 其他区域 — 20台离线

⚠️ 重点关注：
兰州石化区域有2台电气火灾监控器离线超过4小时，建议立即排查。`,
    type: 'normal',
  },
  '维保到期提醒': {
    content: `🔧 维保到期提醒

⏰ 7天内到期：15台
⏰ 30天内到期：68台

🔴 紧急（2天内）：
• 万达广场喷淋泵 — 2天后到期
• 兰大二院排烟风机 — 5天后到期
• 兰州中心消防栓泵 — 7天后到期

🟡 即将到期（7天内）：
• 万达广场烟感探测器 x12
• 兰州中心手动报警按钮 x3

💡 建议：请及时联系维保公司安排上门维护。`,
    type: 'warning',
  },
  '巡检任务进度': {
    content: `📋 巡检任务进度（今日）

完成情况：18 / 25 个点位
完成率：72%

🟢 已完成：18个点位
🟡 进行中：3个点位（万达广场1F、兰州中心B1、兰大二院3F）
⚪ 待巡检：4个点位

⚠️ 异常发现（2处）：
• B2层消防栓压力不足（0.18MPa，正常≥0.2MPa）
• 3F走廊应急灯故障（编号EL-203）

👤 巡检人：张强、李明
📞 值班电话：0931-8888888`,
    type: 'normal',
  },
  '单位安全评分': {
    content: `🏆 单位安全评分排名（本月）

🥇 万达广场 — 93分 ⭐⭐⭐⭐⭐
   火警处理率99%，设备在线率97%

🥈 兰大二院 — 91分 ⭐⭐⭐⭐
   巡检覆盖率100%，隐患整改率95%

🥉 兰州中心 — 83分 ⭐⭐⭐⭐
   维保及时率偏低，需加强

4️⃣ 兰州石化 — 88分 ⭐⭐⭐⭐
   电气设备老旧，建议更新

5️⃣ 红星美凯龙 — 85分 ⭐⭐⭐
   应急演练记录不完整`,
    type: 'success',
  },
  '生成日报': {
    content: `📄 日报已生成

2026年4月19日 智慧消防监控日报
━━━━━━━━━━━━━━━━━━━━

📌 告警概况：
   今日告警25起，已处理20起

📌 设备状态：
   在线率98.7%，离线42台

📌 巡检进度：
   完成18/25点位（72%）

📌 维保提醒：
   7天内到期15台

📌 消控室在岗：
   全部8个消控室值班人员正常在岗

✅ 报告已保存至「统计报表」页面
📥 点击可直接下载PDF版本`,
    type: 'success',
  },
};

const defaultReply = {
  content: `您好！我是智慧消防AI助手 🤖

我可以为您提供以下智能服务：

🔥 告警查询 — 实时/历史告警统计
🔌 设备状态 — 在线率、离线排查
🔧 维保管理 — 到期提醒、工单跟踪
📋 巡检进度 — 任务分配、异常记录
🏆 安全评分 — 单位排名、趋势分析
📄 报告生成 — 日报/周报/月报

请从下方快捷问题中选择，或直接输入您的问题。`,
  type: 'normal' as const,
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'assistant',
      content: defaultReply.content,
      timestamp: '10:30',
      type: 'normal',
    },
  ]);
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

    setTimeout(() => {
      const response = aiResponses[text] || {
        content: `收到您的问题："${text}"\n\n我正在为您查询相关数据，请稍候...\n\n💡 提示：您可以尝试以下快捷问题：\n• 今日告警统计\n• 设备在线情况\n• 维保到期提醒\n• 巡检任务进度\n• 单位安全评分`,
        type: 'normal' as const,
      };
      const replyId = ++msgIdRef.current;
      setMessages(prev => [
        ...prev,
        {
          id: replyId,
          role: 'assistant',
          content: response.content,
          timestamp: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
          type: response.type,
        },
      ]);
      setIsTyping(false);
    }, 800 + (text.length % 6) * 100);
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
