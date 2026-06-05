import { create } from 'zustand';
import { ParsedRecord } from '@/types';

interface ImportState {
  file: File | null;
  fileName: string;
  fileType: string;
  fileData: string; // base64
  selectedRuleId: string;
  isParsing: boolean;
  parseProgress: number;
  parseProgressText: string;
  records: ParsedRecord[];
  parseError: string | null;

  setFile: (file: File | null) => void;
  setFileData: (data: string) => void;
  setSelectedRuleId: (id: string) => void;
  setParsing: (parsing: boolean) => void;
  setParseProgress: (progress: number, text?: string) => void;
  setRecords: (records: ParsedRecord[] | ((prev: ParsedRecord[]) => ParsedRecord[])) => void;
  setParseError: (error: string | null) => void;
  updateRecord: (index: number, field: string, value: any) => void;
  deleteRecord: (index: number) => void;
  addEmptyRecord: () => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  file: null,
  fileName: '',
  fileType: '',
  fileData: '',
  selectedRuleId: '',
  isParsing: false,
  parseProgress: 0,
  parseProgressText: '',
  records: [],
  parseError: null,

  setFile: (file) => set({
    file,
    fileName: file?.name || '',
    fileType: file?.name.split('.').pop()?.toLowerCase() || '',
  }),
  setFileData: (data) => set({ fileData: data }),
  setSelectedRuleId: (id) => set({ selectedRuleId: id }),
  setParsing: (parsing) => set({ isParsing: parsing }),
  setParseProgress: (progress, text) => set({
    parseProgress: progress,
    parseProgressText: text || `${Math.round(progress * 100)}%`,
  }),
  setRecords: (records) => {
    if (typeof records === 'function') {
      const updater = records as (prev: ParsedRecord[]) => ParsedRecord[];
      set((state) => ({ records: updater(state.records) }));
    } else {
      set({ records });
    }
  },
  setParseError: (error) => set({ parseError: error }),
  updateRecord: (index, field, value) => set((state) => {
    const records = [...state.records];
    if (records[index]) {
      records[index] = { ...records[index], [field]: value };
    }
    return { records };
  }),
  deleteRecord: (index) => set((state) => ({
    records: state.records.filter((_, i) => i !== index),
  })),
  addEmptyRecord: () => set((state) => ({
    records: [...state.records, {
      rowIndex: state.records.length + 1,
      externalCode: '',
      storeName: '',
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      skuCode: '',
      skuName: '',
      skuQuantity: 0,
      skuSpec: '',
      remark: '',
      errors: [],
    }],
  })),
  reset: () => set({
    file: null,
    fileName: '',
    fileType: '',
    fileData: '',
    selectedRuleId: '',
    isParsing: false,
    parseProgress: 0,
    parseProgressText: '',
    records: [],
    parseError: null,
  }),
}));
