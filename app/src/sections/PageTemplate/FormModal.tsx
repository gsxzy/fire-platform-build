import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save, AlertTriangle, Loader2 } from 'lucide-react';
import type { FormField } from './types';

interface FormModalProps {
  title: string;
  fields: FormField[];
  initialValues: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void | Promise<unknown>;
  onClose: () => void;
}

export function FormModal({ title, fields, initialValues, onSave, onClose }: FormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...initialValues });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (vals: Record<string, unknown>): Record<string, string> => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const raw = vals[f.key];
      const val = f.type === 'number'
        ? (raw === '' || raw === undefined || raw === null ? '' : String(raw).trim())
        : String(raw ?? '').trim();
      if (f.required && !val && f.type !== 'checkbox') {
        errs[f.key] = `${f.label}不能为空`;
      }
      if (val) {
        const phoneLike = f.key === 'phone' || f.key === 'contact_phone' || f.key === 'contactPhone'
          || (typeof f.label === 'string' && f.label.includes('电话'));
        if (phoneLike) {
          const strict = !!f.required || val.replace(/\D/g, '').length >= 7;
          if (strict && !/^1[3-9]\d{9}$/.test(val) && !/^(0\d{2,3}-?)?\d{7,8}$/.test(val)) {
            errs[f.key] = '请输入有效的电话号码';
          }
        }
        const emailLike = f.key === 'email' || f.key === 'contact_email'
          || (typeof f.label === 'string' && f.label.includes('邮箱'));
        if (emailLike && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errs[f.key] = '请输入有效的邮箱地址';
        }
        if (f.key === 'lng' && (Number(val) < -180 || Number(val) > 180)) {
          errs[f.key] = '经度范围应为 -180 ~ 180';
        }
        if (f.key === 'lat' && (Number(val) < -90 || Number(val) > 90)) {
          errs[f.key] = '纬度范围应为 -90 ~ 90';
        }
      }
    }
    return errs;
  };

  const handleChange = (key: string, value: unknown) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setTouched(prev => new Set(prev).add(key));
    setErrors(validate(next));
  };

  const handleSubmit = () => {
    const allTouched = new Set(fields.map(f => f.key));
    setTouched(allTouched);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    Promise.resolve(onSave(values)).finally(() => setSaving(false));
  };

  const isValid = Object.keys(validate(values)).length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-700 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-600/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map(field => {
            const hasErr = touched.has(field.key) && !!errors[field.key];
            return (
            <div key={field.key}>
              <label className="text-[11px] text-slate-300 mb-1.5 block font-medium">
                {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.disabled || field.type === 'readonly' ? (
                <div className="w-full bg-slate-800/50 border border-slate-600/20 rounded-lg px-3 py-2 text-xs text-slate-400 select-none">
                  {String(values[field.key] ?? '-')}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!values[field.key]}
                    onChange={e => handleChange(field.key, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/30 text-blue-500 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-400">{field.placeholder || '是'}</span>
                </label>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={String(values[field.key] ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || `输入${field.label}`}
                  rows={3}
                  className={`w-full bg-slate-700/40 border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/50 resize-none transition-colors focus:bg-slate-700/60 ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(values[field.key] ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className={`w-full bg-slate-700/40 border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors focus:bg-slate-700/60 ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30 focus:border-blue-500/50'}`}
                >
                  <option value="">请选择</option>
                  {field.options?.map(opt => {
                    const isObj = typeof opt === 'object' && opt !== null;
                    const label = isObj ? (opt as { label: string }).label : opt;
                    const value = isObj ? (opt as { value: string }).value : opt;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              ) : field.type === 'date' ? (
                <input type="date" value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} className={`w-full bg-slate-700/40 border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-colors focus:bg-slate-700/60 ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30 focus:border-blue-500/50'}`} />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={values[field.key] === '' || values[field.key] === undefined || values[field.key] === null
                    ? ''
                    : String(values[field.key])}
                  onChange={e => {
                    const t = e.target.value;
                    if (t === '') {
                      handleChange(field.key, '');
                      return;
                    }
                    const n = Number(t);
                    handleChange(field.key, Number.isFinite(n) ? n : '');
                  }}
                  placeholder={field.placeholder || `输入${field.label}`}
                  className={`w-full bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`}
                />
              ) : (
                <Input value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder || `输入${field.label}`} className={`h-8 text-xs bg-slate-700/30 text-slate-200 transition-colors ${hasErr ? 'border-red-500/50 focus-visible:ring-red-500/30' : 'border-slate-600/30'}`} />
              )}
              {hasErr && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors[field.key]}</p>}
            </div>
          );})}
        </div>
        <div className="p-4 border-t border-slate-600/30 flex justify-end gap-2.5 bg-slate-800/60">
          <Button variant="outline" size="sm" className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700/60 hover:text-slate-200 rounded-lg transition-colors" onClick={onClose} disabled={saving}>取消</Button>
          <Button size="sm" className={`h-8 text-xs flex items-center gap-1.5 rounded-lg transition-all ${isValid && !saving ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`} onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
