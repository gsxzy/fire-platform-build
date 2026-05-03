import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Search, FileText, Shield, Flame,
  Download, Eye
} from 'lucide-react';

const fallbackCategories = [
  { key: 'all', label: '全部文档', count: 24 },
  { key: 'law', label: '消防法规', count: 8 },
  { key: 'guide', label: '操作指南', count: 6 },
  { key: 'plan', label: '应急预案', count: 5 },
  { key: 'training', label: '培训资料', count: 5 },
];

const fallbackDocuments = [
  { id: 1, title: 'GB 26875-2011 城市消防远程监控系统技术规范', category: 'law', type: '国家标准', size: '2.1MB', updateDate: '2024-12-01', downloads: 156, important: true },
  { id: 2, title: 'GB 50116-2013 火灾自动报警系统设计规范', category: 'law', type: '国家标准', size: '3.5MB', updateDate: '2024-11-20', downloads: 234, important: true },
  { id: 3, title: 'GB 50016-2014 建筑设计防火规范（2018版）', category: 'law', type: '国家标准', size: '8.2MB', updateDate: '2024-10-15', downloads: 312, important: true },
  { id: 4, title: '消防控制室通用技术要求 GB 25506', category: 'law', type: '国家标准', size: '1.8MB', updateDate: '2024-09-01', downloads: 189, important: false },
  { id: 5, title: '消防设施操作员国家职业技能标准', category: 'law', type: '行业标准', size: '4.3MB', updateDate: '2024-08-20', downloads: 267, important: true },
  { id: 6, title: '火灾报警控制器操作手册', category: 'guide', type: '操作指南', size: '5.6MB', updateDate: '2024-12-15', downloads: 145, important: true },
  { id: 7, title: '消防泵组启停操作规范', category: 'guide', type: '操作指南', size: '2.3MB', updateDate: '2024-11-30', downloads: 98, important: false },
  { id: 8, title: '消控室值班人员日常巡检指南', category: 'guide', type: '操作指南', size: '1.5MB', updateDate: '2025-01-10', downloads: 178, important: true },
  { id: 9, title: '电气火灾监控系统维护手册', category: 'guide', type: '操作指南', size: '3.2MB', updateDate: '2024-12-20', downloads: 87, important: false },
  { id: 10, title: '防排烟系统操作与维护指南', category: 'guide', type: '操作指南', size: '4.1MB', updateDate: '2024-11-25', downloads: 112, important: false },
  { id: 11, title: '高层建筑灭火疏散应急预案模板', category: 'plan', type: '应急预案', size: '1.2MB', updateDate: '2024-12-05', downloads: 203, important: true },
  { id: 12, title: '商业综合体消防应急预案', category: 'plan', type: '应急预案', size: '2.8MB', updateDate: '2024-11-10', downloads: 156, important: true },
  { id: 13, title: '化工企业火灾应急处置预案', category: 'plan', type: '应急预案', size: '3.5MB', updateDate: '2024-10-20', downloads: 134, important: true },
  { id: 14, title: '消防设施操作员培训教材（中级）', category: 'training', type: '培训资料', size: '15.2MB', updateDate: '2024-09-15', downloads: 345, important: true },
  { id: 15, title: '消防安全"四个能力"建设培训课件', category: 'training', type: '培训资料', size: '12.8MB', updateDate: '2024-12-25', downloads: 278, important: false },
];

const catIcon = (key: string) => {
  switch (key) {
    case 'law': return <Shield className="w-3.5 h-3.5" />;
    case 'guide': return <FileText className="w-3.5 h-3.5" />;
    case 'plan': return <Flame className="w-3.5 h-3.5" />;
    case 'training': return <BookOpen className="w-3.5 h-3.5" />;
    default: return <BookOpen className="w-3.5 h-3.5" />;
  }
};

export default function KnowledgeBasePage() {
  const [activeCat, setActiveCat] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState(fallbackCategories as any);
  const [documents, setDocuments] = useState(fallbackDocuments as any);

  useEffect(() => {
    legacyApi.knowledgeCategories().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setCategories(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    legacyApi.knowledgeList().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setDocuments(list);
    }).catch(() => {});
  }, []);

  const filtered = documents.filter((d: any) => {
    if (activeCat !== 'all' && d.category !== activeCat) return false;
    if (keyword && !d.title.includes(keyword)) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">消防知识库</h2>
            <p className="text-[10px] text-slate-500">消防法规与操作手册</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">{documents.length}份文档</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索文档" className="pl-8 h-8 w-48 text-xs bg-slate-800 border-slate-700 text-slate-200" />
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {categories.map((c: any) => (
          <button key={c.key} onClick={() => setActiveCat(c.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs ${
              activeCat === c.key ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-slate-700/50 bg-slate-800/30 text-slate-500 hover:bg-slate-700/30'
            }`}
          >
            {catIcon(c.key)}
            <span>{c.label}</span>
            <span className={`text-[9px] ${activeCat === c.key ? 'text-blue-400' : 'text-slate-600'}`}>({c.count})</span>
          </button>
        ))}
      </div>

      <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
            <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
              <span className="col-span-5">文档名称</span>
              <span className="col-span-1">分类</span>
              <span className="col-span-1">格式</span>
              <span className="col-span-1">大小</span>
              <span className="col-span-1">更新日期</span>
              <span className="col-span-1">下载</span>
              <span className="col-span-2">操作</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
            {filtered.map((doc: any) => (
              <div key={doc.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/20 transition-all items-center">
                <div className="col-span-5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-200 font-medium block truncate">{doc.title}</span>
                    {doc.important && <Badge className="text-[7px] bg-red-500/20 text-red-400 border-red-500/30 px-0.5 mt-0.5">重点</Badge>}
                  </div>
                </div>
                <span className="col-span-1 text-[9px] text-slate-400">{doc.type}</span>
                <span className="col-span-1"><Badge variant="outline" className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30 px-0.5">PDF</Badge></span>
                <span className="col-span-1 text-[9px] text-slate-500">{doc.size}</span>
                <span className="col-span-1 text-[9px] text-slate-500">{doc.updateDate}</span>
                <span className="col-span-1 text-[9px] text-slate-400">{doc.downloads}</span>
                <span className="col-span-2 flex gap-0.5">
                  <Button size="sm" variant="ghost" className="h-6 px-1 text-[8px] text-slate-400 hover:text-blue-400"><Eye className="w-3 h-3 mr-0.5" />预览</Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1 text-[8px] text-slate-400 hover:text-emerald-400"><Download className="w-3 h-3 mr-0.5" />下载</Button>
                </span>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-10 text-xs text-slate-600">未找到匹配的文档</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
