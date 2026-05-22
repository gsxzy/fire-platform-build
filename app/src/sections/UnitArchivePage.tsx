import { useMemo } from 'react';
import { useLocation } from 'react-router';
import PageTemplate from '@/sections/PageTemplate';
import { unitService } from '@/api/services';
import { Building2 } from 'lucide-react';

const typeMap: Record<string, string> = {
  general: '一般单位', key: '重点单位', 'nine-small': '九小场所',
  '1': '一般单位', '2': '重点单位', '3': '九小场所',
};

const riskMap: Record<string, string> = {
  low: '低风险', medium: '中风险', high: '高风险',
  '1': '低风险', '2': '中风险', '3': '高风险',
};

const statusMap: Record<number | string, string> = {
  1: '正常', 0: '停用',
  normal: '正常', fault: '故障', maintenance: '维护', offline: '离线', disabled: '禁用',
};

const COLUMNS = [
  { key: 'unit_code', label: '单位编码', width: '120px' },
  { key: 'name', label: '单位名称', width: '180px' },
  { key: 'type', label: '单位类型', width: '100px', render: (v: unknown) => (() => { const s = v == null ? '' : String(v); return typeMap[s] || s || '-'; })() },
  { key: 'address', label: '地址', width: '200px' },
  { key: 'contact_name', label: '联系人', width: '90px' },
  { key: 'contact_phone', label: '联系电话', width: '120px' },
  { key: 'risk_level', label: '风险等级', width: '90px', render: (v: unknown) => (() => { const s = v == null ? '' : String(v); return riskMap[s] || s || '-'; })() },
  { key: 'status', label: '状态', width: '70px', render: (v: unknown) => (() => { const s = v == null ? '' : String(v); return statusMap[s] || s || '-'; })() },
];

const FIELDS = [
  { key: 'unit_code', label: '单位编码', type: 'text' as const, required: true, placeholder: '如: UN-001' },
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

/** 将后端 fire_unit 表字段转换为前端 Unit 字段 */
function mapBackendUnit(row: any) {
  const typeMapNum: Record<number, string> = { 1: 'general', 2: 'key', 3: 'nine-small' };
  const riskMapNum: Record<number, string> = { 1: 'low', 2: 'medium', 3: 'high' };
  return {
    ...row,
    name: row.unit_name ?? row.name,
    type: typeMapNum[row.unit_type] ?? row.type ?? 'general',
    /* 库表为 fire_level，与迁移脚本及 UnitController 写入一致 */
    risk_level: riskMapNum[row.risk_level] ?? riskMapNum[row.fire_level] ?? row.risk_level ?? 'low',
    unit_code: row.unit_code ?? row.id,
  };
}

/* ── 前端 Unit → 后端 fire_unit 字段映射 ── */
function mapUnitToBackend(data: Record<string, unknown>): any {
  return {
    name: data.name,
    unit_code: data.unit_code,
    type: data.type,
    supervision_level: data.supervision_level,
    address: data.address,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone,
    contact_email: data.contact_email,
    legal_person: data.legal_person,
    license_no: data.license_no,
    area: data.area,
    lng: data.lng,
    lat: data.lat,
    risk_level: data.risk_level,
    status: data.status,
    remark: data.remark,
  };
}

/** 包装 service，在 list 返回时做字段转换，create/update 做字段映射 */
const wrappedUnitService = {
  ...unitService,
  list: async (params: any) => {
    const res = await unitService.list(params);
    if (res?.data?.list) {
      res.data.list = res.data.list.map(mapBackendUnit);
    }
    return res;
  },
  create: async (data: Record<string, unknown>) => unitService.create(mapUnitToBackend(data) as any),
  update: async (id: string, data: Record<string, unknown>) => unitService.update(id, mapUnitToBackend(data) as any),
};

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

  const formInitialDefaults = useMemo(
    () => ({
      type: initialFilters.type,
      status: '1',
      risk_level: 'low',
    }),
    [initialFilters.type]
  );

  return (
    <PageTemplate
      title={pageTitle}
      icon={Building2}
      columns={COLUMNS}
      service={wrappedUnitService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      initialFilters={initialFilters}
      formInitialDefaults={formInitialDefaults}
      searchable
      addable
      actions
      batchable
      exportable
      refreshable
      emptyDescription="单位档案用于监管与设备归属。若无数据请检查接口权限与单位类型筛选；可通过「新增」补录联网单位信息。"
    />
  );
}
