export interface FieldMapping {
  targetField: string;
  sourceType: 'column' | 'static' | 'regex' | 'position';
  sourceValue: string;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface TailPattern {
  field: string;
  pattern: string; // regex pattern
  rowOffset: number;
}

export interface CardFieldPattern {
  field: string;
  pattern: string; // regex pattern
}

export interface TextFieldPattern {
  field: string;
  pattern: string; // regex pattern
}

export interface FileConfig {
  skipRows: number;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number | 'auto';
  sheetMode: 'single' | 'all' | 'named';
  sheetNames?: string[];
  sheetIndex?: number;
}

export interface TailExtraction {
  enabled: boolean;
  startOffset: number;
  patterns: TailPattern[];
}

export interface Aggregation {
  enabled: boolean;
  groupByKey: string;
  sharedFields: string[];
}

export interface Transpose {
  enabled: boolean;
  pivotColumn: number;
  valueStartColumn: number;
  pivotFieldName: string;
  valueFieldName: string;
  headerRow?: number;
  compositeSplit?: {
    enabled: boolean;
    separator: string;
    itemPattern: string;
  };
}

export interface CardConfig {
  startPattern: string;
  fieldPatterns: CardFieldPattern[];
  tableStartPattern?: string;
  tableEndPattern?: string;
  headerRow?: number;
}

export interface TextConfig {
  recordSeparator: string;
  fieldPatterns: TextFieldPattern[];
  itemPattern?: string;
}

export interface ParseRule {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  fileConfig: FileConfig;
  parseMode: 'table' | 'matrix' | 'card' | 'text' | 'pdf';
  fieldMappings: FieldMapping[];
  tailExtraction?: TailExtraction;
  aggregation?: Aggregation;
  transpose?: Transpose;
  card?: CardConfig;
  text?: TextConfig;
  defaults?: Record<string, string>;
}

export type ParseRuleCreate = Omit<ParseRule, 'id' | 'createdAt' | 'updatedAt'>;
export type ParseRuleUpdate = Partial<ParseRuleCreate>;
