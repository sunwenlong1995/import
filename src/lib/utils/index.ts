import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (['docx', 'doc'].includes(ext)) return 'word';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

export function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
