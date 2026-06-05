import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function getFileType(fileName: string): 'excel' | 'word' | 'pdf' | 'unknown' {
  const ext = getFileExtension(fileName);
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (['docx', 'doc'].includes(ext)) return 'word';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}

export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}
