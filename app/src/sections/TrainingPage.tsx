import { useState, useEffect, useCallback } from 'react';
import { trainingService } from '@/api/services';
import DataContainer from '@/components/DataContainer';
import {
  GraduationCap, Calendar, Users, Award,
  FileText, Upload, CheckCircle, XCircle,
  Play, ChevronLeft, Save
} from 'lucide-react';

type TabKey = 'plan' | 'exam' | 'record' | 'cert';

interface ExamItem {
  id: number;
  examName: string;
  duration: number;
  passScore: number;
  questionCount: number;
  totalScore: number;
}

interface RecordItem {
  id: number;
  recordNo: string;
  examName: string;
  examineeName: string;
  score: number;
  totalScore: number;
  pass: boolean;
  certNo: string | null;
  duration?: number;
  createdAt: string;
}

export default function TrainingPage() {
  const [tab, setTab] = useState<TabKey>('plan');
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [certRecords, setCertRecords] = useState<any[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 考试答题状态
  const [takingExam, setTakingExam] = useState<ExamItem | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [examineeName, setExamineeName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [examStartTime, setExamStartTime] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseRes, examRes, recordRes] = await Promise.all([
        trainingService.courseList() as any,
        trainingService.examList() as any,
        trainingService.recordList() as any,
      ]);
      const courseData = courseRes.data ?? courseRes;
      const courseList = Array.isArray(courseData) ? courseData : (courseData.list || []);
      setTrainingPlans(courseList);

      const examData = examRes.data ?? examRes;
      const examList = Array.isArray(examData) ? examData : (examData.list || []);
      setExams(examList);

      const recordData = recordRes.data ?? recordRes;
      const recordList = Array.isArray(recordData) ? recordData : (recordData.list || []);
      setRecords(recordList);

      // 证书数据从通过的成绩中提取
      setCertRecords(recordList.filter((r: RecordItem) => r.pass && r.certNo));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const startExam = async (exam: ExamItem) => {
    try {
      const res = await trainingService.examById(exam.id) as any;
      const data = res?.data ?? res;
      setTakingExam(exam);
      setQuestions(data?.questions || []);
      setAnswers({});
      setResult(null);
      setExamStartTime(Date.now());
    } catch (e) {
      alert('加载试卷失败');
    }
  };

  const submitExam = async () => {
    if (!examineeName.trim()) { alert('请输入考生姓名'); return; }
    if (!takingExam) return;
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`还有 ${unanswered.length} 道题未答，确定提交吗？`)) return;
    }
    setSubmitting(true);
    try {
      const duration = Math.round((Date.now() - examStartTime) / 1000);
      const res = await trainingService.submitExam(takingExam.id, {
        examineeName: examineeName.trim(),
        answers,
        duration,
      }) as any;
      setResult(res?.data ?? res);
      await loadData();
    } catch (e: any) {
      alert(e?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 考试答题界面 ──
  if (takingExam) {
    return (
      <div className="h-full flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setTakingExam(null)} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-200">
            <ChevronLeft className="w-3 h-3" />返回
          </button>
          <span className="text-xs font-medium text-slate-200">{takingExam.examName}</span>
          <span className="text-[10px] text-slate-500">共 {questions.length} 题 / 满分 {takingExam.totalScore}</span>
        </div>

        {!result ? (
          <>
            <div className="flex items-center gap-2">
              <input
                value={examineeName}
                onChange={(e) => setExamineeName(e.target.value)}
                placeholder="请输入考生姓名"
                className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-1.5 text-[10px] text-slate-200 outline-none w-40"
              />
              <span className="text-[10px] text-slate-500">及格线: {takingExam.passScore}分</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3">
                  <div className="text-[11px] text-slate-200 mb-2">
                    <span className="text-blue-400 mr-1">{idx + 1}.</span>
                    {q.question} <span className="text-slate-500">({q.score}分)</span>
                  </div>
                  <div className="space-y-1">
                    {(q.options || []).map((opt: string, i: number) => {
                      const label = String.fromCharCode(65 + i);
                      const selected = answers[q.id] === label;
                      return (
                        <label key={i} className={`flex items-center gap-2 text-[10px] p-1.5 rounded cursor-pointer transition-colors ${selected ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-slate-700/20'}`}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={label}
                            checked={selected}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: label }))}
                            className="accent-blue-500"
                          />
                          <span className={selected ? 'text-blue-400' : 'text-slate-300'}>{label}. {opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={submitExam}
              disabled={submitting}
              className="self-end text-[10px] px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3 h-3" />{submitting ? '提交中...' : '提交答卷'}
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-6 text-center space-y-3 max-w-sm">
              {result.passed ? (
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              )}
              <div className="text-lg font-bold text-slate-100">{result.passed ? '考核通过' : '考核未通过'}</div>
              <div className="text-[11px] text-slate-400">得分: <span className="text-slate-200 font-bold">{result.score}</span> / {result.totalScore}</div>
              {result.certNo && (
                <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  证书编号: {result.certNo}
                </div>
              )}
              <button onClick={() => setTakingExam(null)} className="text-[10px] px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                返回列表
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <DataContainer loading={loading} error={error} data={trainingPlans} onRetry={loadData} emptyText="暂无数据">
      <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
        {/* Header */}
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">培训考核管理</h2>
              <p className="text-[10px] text-slate-500">消防培训、在线考试与证书管理</p>
            </div>
          </div>
          <div className="flex gap-1">
            {[
              { key: 'plan' as TabKey, label: '培训计划', icon: Calendar },
              { key: 'exam' as TabKey, label: '在线考试', icon: FileText },
              { key: 'record' as TabKey, label: '成绩查询', icon: Award },
              { key: 'cert' as TabKey, label: '证书管理', icon: CheckCircle },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
                    tab === t.key
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 flex-shrink-0">
          {[
            { label: '培训课程', value: trainingPlans.length, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: '考核试卷', value: exams.length, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: '考试人次', value: records.length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: '持证人数', value: certRecords.length, icon: Award, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`${s.bg} border border-slate-700/30 rounded-xl p-3`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <div>
                    <div className="text-lg font-bold text-slate-100">{s.value}</div>
                    <div className="text-[9px] text-slate-500">{s.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'plan' && (
          <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700/30 text-[10px] text-slate-500 grid grid-cols-12 gap-1 px-3">
              <span className="col-span-3">培训名称</span>
              <span className="col-span-1">类型</span>
              <span className="col-span-2">内容摘要</span>
              <span className="col-span-2">课件</span>
              <span className="col-span-1">时长</span>
              <span className="col-span-1">状态</span>
              <span className="col-span-1">操作</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {trainingPlans.map((p: any) => (
                <div key={p.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center text-[10px]">
                  <span className="col-span-3 text-slate-200 font-medium truncate">{p.course_name}</span>
                  <span className="col-span-1">
                    <span className={`px-1.5 py-0.5 rounded border ${p.course_type === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : p.course_type === 2 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {p.course_type === 1 ? '安全' : p.course_type === 2 ? '操作' : '法规'}
                    </span>
                  </span>
                  <span className="col-span-2 text-slate-400 truncate">{p.content ? (p.content.length > 20 ? p.content.slice(0, 20) + '…' : p.content) : '--'}</span>
                  <span className="col-span-2">
                    {p.file_url ? (
                      <a href={p.file_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                        <Upload className="w-3 h-3" />查看课件
                      </a>
                    ) : (
                      <span className="text-slate-600">--</span>
                    )}
                  </span>
                  <span className="col-span-1 text-slate-400">{p.duration ? `${p.duration}min` : '--'}</span>
                  <span className="col-span-1">
                    <span className={`px-1.5 py-0.5 rounded ${p.status === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-500'}`}>
                      {p.status === 1 ? '有效' : '停用'}
                    </span>
                  </span>
                  <span className="col-span-1">
                    <button className="text-blue-400 hover:text-blue-300">详情</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'exam' && (
          <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700/30 text-[10px] text-slate-500 grid grid-cols-12 gap-1 px-3">
              <span className="col-span-4">试卷名称</span>
              <span className="col-span-1">题数</span>
              <span className="col-span-1">满分</span>
              <span className="col-span-1">及格线</span>
              <span className="col-span-1">限时</span>
              <span className="col-span-1">状态</span>
              <span className="col-span-2">操作</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {exams.map((e: any) => (
                <div key={e.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center text-[10px]">
                  <span className="col-span-4 text-slate-200 font-medium truncate">{e.exam_name}</span>
                  <span className="col-span-1 text-slate-400">{e.questionCount ?? '--'}</span>
                  <span className="col-span-1 text-slate-400">{e.totalScore ?? '--'}</span>
                  <span className="col-span-1 text-slate-400">{e.pass_score ?? 60}</span>
                  <span className="col-span-1 text-slate-400">{e.duration ? `${e.duration}min` : '--'}</span>
                  <span className="col-span-1">
                    <span className={`px-1.5 py-0.5 rounded ${e.status === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-500'}`}>
                      {e.status === 1 ? '有效' : '停用'}
                    </span>
                  </span>
                  <span className="col-span-2">
                    <button
                      onClick={() => startExam(e)}
                      className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />开始答题
                    </button>
                  </span>
                </div>
              ))}
              {exams.length === 0 && (
                <div className="p-8 text-center text-[11px] text-slate-500">暂无考核试卷</div>
              )}
            </div>
          </div>
        )}

        {tab === 'record' && (
          <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700/30 text-[10px] text-slate-500 grid grid-cols-12 gap-1 px-3">
              <span className="col-span-2">考生姓名</span>
              <span className="col-span-3">试卷名称</span>
              <span className="col-span-1">得分</span>
              <span className="col-span-1">结果</span>
              <span className="col-span-2">用时</span>
              <span className="col-span-2">考试时间</span>
              <span className="col-span-1">证书</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {records.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center text-[10px]">
                  <span className="col-span-2 text-slate-200">{r.examineeName}</span>
                  <span className="col-span-3 text-slate-400 truncate">{r.examName}</span>
                  <span className="col-span-1 font-mono">{r.score}/{r.totalScore}</span>
                  <span className="col-span-1">
                    <span className={`px-1.5 py-0.5 rounded ${r.pass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {r.pass ? '通过' : '未通过'}
                    </span>
                  </span>
                  <span className="col-span-2 text-slate-400">{r.duration ? `${Math.floor(r.duration / 60)}分${r.duration % 60}秒` : '--'}</span>
                  <span className="col-span-2 text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                  <span className="col-span-1">
                    {r.certNo ? (
                      <span className="text-emerald-400">{r.certNo}</span>
                    ) : (
                      <span className="text-slate-600">--</span>
                    )}
                  </span>
                </div>
              ))}
              {records.length === 0 && (
                <div className="p-8 text-center text-[11px] text-slate-500">暂无考试记录</div>
              )}
            </div>
          </div>
        )}

        {tab === 'cert' && (
          <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/30 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700/30 text-[10px] text-slate-500 grid grid-cols-12 gap-1 px-3">
              <span className="col-span-2">考生姓名</span>
              <span className="col-span-3">试卷名称</span>
              <span className="col-span-2">证书编号</span>
              <span className="col-span-2">得分</span>
              <span className="col-span-2">考试时间</span>
              <span className="col-span-1">状态</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {certRecords.map((c: any) => (
                <div key={c.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center text-[10px]">
                  <span className="col-span-2 text-slate-200">{c.examineeName}</span>
                  <span className="col-span-3 text-slate-400 truncate">{c.examName}</span>
                  <span className="col-span-2 font-mono text-emerald-400">{c.certNo}</span>
                  <span className="col-span-2 font-mono">{c.score}/{c.totalScore}</span>
                  <span className="col-span-2 text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                  <span className="col-span-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">有效</span>
                  </span>
                </div>
              ))}
              {certRecords.length === 0 && (
                <div className="p-8 text-center text-[11px] text-slate-500">暂无证书记录</div>
              )}
            </div>
          </div>
        )}
      </div>
    </DataContainer>
  );
}
