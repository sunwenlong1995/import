export interface Waybill {
  id: string;
  externalCode: string;
  storeName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  skuCode: string;
  skuName: string;
  skuQuantity: number;
  skuSpec: string;
  remark: string;
  batchId: string;
  submittedAt: string;
}

export interface ParsedRecord {
  rowIndex: number;
  externalCode: string;
  storeName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  skuCode: string;
  skuName: string;
  skuQuantity: number;
  skuSpec: string;
  remark: string;
  errors: FieldError[];
  isDuplicate?: boolean;
  duplicateOf?: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ImportBatch {
  id: string;
  ruleId: string;
  fileName: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
}
