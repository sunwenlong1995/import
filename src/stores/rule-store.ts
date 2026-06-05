import { create } from 'zustand';
import { ParseRule } from '@/types';

interface RuleState {
  rules: ParseRule[];
  currentRule: ParseRule | null;
  isLoading: boolean;
  error: string | null;

  setRules: (rules: ParseRule[]) => void;
  setCurrentRule: (rule: ParseRule | null) => void;
  addRule: (rule: ParseRule) => void;
  updateRule: (id: string, rule: Partial<ParseRule>) => void;
  removeRule: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRuleStore = create<RuleState>((set) => ({
  rules: [],
  currentRule: null,
  isLoading: false,
  error: null,

  setRules: (rules) => set({ rules }),
  setCurrentRule: (rule) => set({ currentRule: rule }),
  addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
  updateRule: (id, updates) => set((state) => ({
    rules: state.rules.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
  })),
  removeRule: (id) => set((state) => ({
    rules: state.rules.filter(r => r.id !== id),
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
