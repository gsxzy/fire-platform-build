import { useMemo } from 'react';
import { useLocation } from 'react-router';
import PageTemplate from '@/sections/PageTemplate';
import { unitService } from '@/api/services';
import { Building2 } from 'lucide-react';

const typeMap: Record<string, string> = {
  general: '一般单位', key: '重点单位', 'nine-small': '九小场所',
};

const riskMap: Record<string, string> = {
  low: '低风险', medium: '中风险', high: '高风险',
};

const statusMap: Record<number | string, string> = {
  1: '正常', 0: '停用',
  normal: '正常', fault: '故障', maintenance: '维护', offline: '离线', disabled: '禁用',
};

const COLUMNS = [
  { key: 'id', label: '单位编码', width: '120px' },
  { key: 'name', label: '单位名称', width: '180px' },
  { key: 'type', label: '单位类型', width: '100px', render: (v: unknown) => typeMap[String(v)] || String(v) },
  { key: 'address', label: '地址', width: '200px' },
  { key: 'contact_name', label: '联系人', width: '90px' },
  { key: 'contact_phone', label: '联系电话', width: '120px' },
  { key: 'risk_level', label: '风险等级', width: '90px', render: (v: unknown) => riskMap[String(v)] || String(v) },
  { key: 'status', label: '状态', width: '70px', render: (v: unknown) => statusMap[String(v)] || String(v) },
];

const FIELDS = [
  { key: 'id', label: '单位编码', type: 'text' as const, required: true, placeholder: '如: UN-001' },
  { key: 'name', label: '单位名称', type: 'text' as const, required: true },
  { key: 'type', label: '单位类型', type: 'select' as const, required: true, options: [
    { label: '一般单位', value: 'general' },
    { label: '重点单位', value: 'key' },
    { label: '九小场所', value: 'nine-small' },
  ]},
  { key: 'supervision_level', label: '监管等级', type: 'select' as const, options: [
    { label: '一般单位', value: 'general' },
    { label: '重点单位', value: 'key' },
    { label: '九小场所', value: 'nine-small' },
  ]},
  { key: 'address', label: '地址', type: 'text' as const, required: true },
  { key: 'contact_name', label: '联系人', type: 'text' as const },
  { key: 'contact_phone', label: '联系电话', type: 'text' as const },
  { key: 'contact_email', label: '联系邮箱', type: 'text' as const },
  { key: 'legal_person', label: '法人', type: 'text' as const },
  { key: 'license_no', label: '统一社会信用代码', type: 'text' as const },
  { key: 'area', label: '占地面积(㎡)', type: 'number' as const },
  { key: 'lng', label: '经度', type: 'number' as const },
  { key: 'lat', label: '纬度', type: 'number' as const },
  { key: 'risk_level', label: '风险等级', type: 'select' as const, options: [
    { label: '低风险', value: 'low' },
    { label: '中风险', value: 'medium' },
    { label: '高风险', value: 'high' },
  ]},
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { label: '正常', value: '1' },
    { label: '停用', value: '0' },
  ]},
  { key: 'remark', label: '备注', type: 'textarea' as const },
];

const FILTER_FIELDS = [
  {
    key: 'risk_level',
    label: '风险等级',
    options: [
      { label: '低风险', value: 'low' },
      { label: '中风险', value: 'medium' },
      { label: '高风险', value: 'high' },
    ],
  },
];

export default function UnitArchivePage() {
  const location = useLocation();

  const { pageTitle, initialFilters } = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/key')) {
      return { pageTitle: '重点单位', initialFilters: { type: 'key' } };
    }
    if (path.includes('/nine-small')) {
      return { pageTitle: '九小场所', initialFilters: { type: 'nine-small' } };
    }
    return { pageTitle: '一般单位', initialFilters: { type: 'general' } };
  }, [location.pathname]);

  return (
    <PageTemplate
      title={pageTitle}
      icon={Building2}
      columns={COLUMNS}
      service={unitService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      initialFilters={initialFilters}
      searchable
      addable
      exportable
      refreshable
    />
  );
}
