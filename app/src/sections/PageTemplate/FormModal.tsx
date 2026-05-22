import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import type { FormField } from './types';
import { MapPickerDialog } from './MapPickerDialog';

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
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in-smooth" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" />
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-600/30 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in-smooth modal-mobile-full" onClick={e => e.stopPropagation()} style={{ animationDuration: '0.25s' }}>
        <div className="p-5 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-slate-800/90 to-slate-900/90">
          <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition-all active:scale-95" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto scrollbar-thin">
          {fields.map(field => {
            const hasErr = touched.has(field.key) && !!errors[field.key];
            return (
            <div key={field.key}>
              <label className="text-xs text-slate-300 mb-2 block font-medium flex items-center gap-1">
                {field.label}{field.required && <span className="text-red-400">*</span>}
              </label>
              {field.disabled || field.type === 'readonly' ? (
                <div className="w-full bg-slate-800/50 border border-slate-600/20 rounded-xl px-3 py-2.5 text-xs text-slate-400 select-none">
                  {String(values[field.key] ?? '-')}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
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
                  className={`w-full bg-slate-800/50 border rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50 resize-none transition-all focus:bg-slate-800/70 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/25'}`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(values[field.key] ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className={`w-full bg-slate-800/50 border rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition-all duration-200 focus:bg-slate-800/70 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/25 focus:border-blue-500/50'}`}
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
                <input type="date" value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} className={`w-full bg-slate-800/50 border rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition-all focus:bg-slate-800/70 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/25 focus:border-blue-500/50'}`} />
              ) : field.type === 'number' ? (
                <div className="flex gap-2">
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
                    className={`flex-1 bg-slate-700/30 border rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors ${hasErr ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/30'}`}
                  />
                  {field.key === 'lng' && (
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="flex-shrink-0 px-3 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs rounded-xl border border-blue-600/25 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5" /> 地图选点
                    </button>
                  )}
                </div>
              ) : (
                <Input value={String(values[field.key] ?? '')} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder || `输入${field.label}`} className={`h-9 text-xs bg-slate-800/50 text-slate-200 transition-all rounded-xl border-slate-600/25 focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] ${hasErr ? 'border-red-500/50 focus-visible:ring-red-500/30' : ''}`} />
              )}
              {hasErr && <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1.5 px-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{errors[field.key]}</p>}
            </div>
          );})}
        </div>
        <div className="p-5 border-t border-slate-700/30 flex justify-end gap-3 bg-gradient-to-r from-slate-800/60 to-slate-900/60">
          <Button variant="outline" size="sm" className="h-9 text-xs border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200 rounded-xl transition-all active:scale-95" onClick={onClose} disabled={saving}>取消</Button>
          <Button size="sm" className={`h-9 text-xs flex items-center gap-2 rounded-xl transition-all ${isValid && !saving ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`} onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
      <MapPickerDialog
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={(lng, lat) => {
          const next = { ...values, lng, lat };
          setValues(next);
          setTouched(prev => new Set(prev).add('lng').add('lat'));
          setErrors(validate(next));
        }}
        initialLng={values.lng !== undefined && values.lng !== '' ? Number(values.lng) : undefined}
        initialLat={values.lat !== undefined && values.lat !== '' ? Number(values.lat) : undefined}
      />
    </div>
  );
}
