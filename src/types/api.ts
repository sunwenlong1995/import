import { ParseRule, ParseRuleCreate, ParseRuleUpdate } from './rule';
import { ParsedRecord, Waybill, ImportBatch } from './waybill';

// Rules API
export interface GetRulesResponse {
  rules: ParseRule[];
}

export interface CreateRuleRequest {
  rule: ParseRuleCreate;
}

export interface CreateRuleResponse {
  rule: ParseRule;
}

export interface UpdateRuleRequest {
  rule: ParseRuleUpdate;
}

export interface UpdateRuleResponse {
  rule: ParseRule;
}

export interface DeleteRuleResponse {
  success: boolean;
}

// Parse API
export interface ParseRequest {
  fileData: string; // base64 encoded
  fileName: string;
  ruleId: string;
}

export interface ParseResponse {
  records: ParsedRecord[];
  errors: { row: number; message: string }[];
  stats: {
    total: number;
    success: number;
    failed: number;
  };
}

// AI API
export interface AnalyzeRequest {
  fileContent: string;
  fileName: string;
  fileType: 'excel' | 'word' | 'pdf';
}

export interface AIFieldSuggestion {
  field: string;
  suggestedSource: string;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

export interface AnalyzeResponse {
  analysis: {
    fileType: string;
    structure: string;
    headerRow: number;
    dataRows: string;
    fields: AIFieldSuggestion[];
    parseMode: string;
    specialFeatures: string[];
  };
  suggestedRule: ParseRule;
}

export interface GenerateRuleRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  userHints?: string;
}

export interface GenerateRuleResponse {
  rule: ParseRule;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

// Waybills API
export interface GetWaybillsRequest {
  page?: number;
  pageSize?: number;
  externalCode?: string;
  receiverName?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetWaybillsResponse {
  waybills: Waybill[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateWaybillsRequest {
  records: ParsedRecord[];
  batchId: string;
  fileName: string;
  ruleId: string;
}

export interface CreateWaybillsResponse {
  success: number;
  failed: number;
  batchId: string;
  errors?: { index: number; message: string }[];
}

// Waybill field names for display
export const WAYBILL_FIELDS = [
  { key: 'externalCode', label: '外部编码', required: false },
  { key: 'storeName', label: '收货门店', required: 'A' },
  { key: 'receiverName', label: '收件人姓名', required: 'B' },
  { key: 'receiverPhone', label: '收件人电话', required: 'B' },
  { key: 'receiverAddress', label: '收件人地址', required: 'B' },
  { key: 'skuCode', label: 'SKU物品编码', required: true },
  { key: 'skuName', label: 'SKU物品名称', required: true },
  { key: 'skuQuantity', label: 'SKU发货数量', required: true },
  { key: 'skuSpec', label: 'SKU规格型号', required: false },
  { key: 'remark', label: '备注', required: false },
] as const;

export type WaybillFieldKey = typeof WAYBILL_FIELDS[number]['key'];
