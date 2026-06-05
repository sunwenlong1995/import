'use client';

import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, File, X } from 'lucide-react';
import { cn, formatFileSize, getFileType } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.docx', '.doc', '.pdf'];

export function FileUploader({ onFileSelect, selectedFile, onClear }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  }, []);

  const validateAndSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTENSIONS.includes(`.${ext}`)) {
      alert('不支持的文件格式，请上传 Excel、Word 或 PDF 文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }
    onFileSelect(file);
  };

  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    switch (type) {
      case 'excel': return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'word': return <FileText className="h-8 w-8 text-blue-600" />;
      case 'pdf': return <File className="h-8 w-8 text-red-600" />;
      default: return <File className="h-8 w-8 text-gray-600" />;
    }
  };

  if (selectedFile) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-4">
          {getFileIcon(selectedFile.name)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)} · {getFileType(selectedFile.name).toUpperCase()}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all cursor-pointer',
        isDragOver
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
      )}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
      <div className={cn(
        'mb-4 rounded-full p-4 transition-colors',
        isDragOver ? 'bg-primary/20' : 'bg-gray-100'
      )}>
        <Upload className={cn('h-8 w-8', isDragOver ? 'text-primary' : 'text-gray-400')} />
      </div>
      <p className="text-sm font-medium text-foreground">
        拖拽文件到此处，或<span className="text-primary">点击上传</span>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        支持 Excel (.xlsx/.xls)、Word (.docx)、PDF 文件，最大 10MB
      </p>
    </div>
  );
}
