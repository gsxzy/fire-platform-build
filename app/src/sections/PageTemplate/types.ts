import type React from 'react';

export interface Column {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'date' | 'number' | 'textarea' | 'checkbox' | 'readonly';
  options?: string[] | { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export interface FilterField {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface PageTemplateProps {
  title?: string;
  icon?: React.ElementType;
  showHeader?: boolean;
  badge?: string;
  badgeColor?: string;
  columns: Column[];
  initialData?: Record<string, unknown>[];
  service?: import('@/hooks/useApiResource').ApiService;
  fields?: FormField[];
  filterFields?: FilterField[];
  initialFilters?: Record<string, string>;
  initialKeyword?: string;
  actions?: boolean;
  searchable?: boolean;
  addable?: boolean;
  pageSize?: number;
  exportable?: boolean;
  printable?: boolean;
  refreshable?: boolean;
  batchable?: boolean;
  filterable?: boolean;
  onCustomAddSave?: (values: Record<string, unknown>) => Promise<boolean>;
  renderExtraActions?: (row: Record<string, unknown>) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  formInitialDefaults?: Record<string, unknown>;
  extraHeaderActions?: React.ReactNode;
}
