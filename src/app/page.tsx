'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/import/file-uploader';
import { RuleSelector } from '@/components/import/rule-selector';
import { ParseProgress } from '@/components/import/parse-progress';
import { AIRuleDialog } from '@/components/import/ai-rule-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useImportStore } from '@/stores/import-store';
import { useRuleStore } from '@/stores/rule-store';
import { useToast } from '@/components/ui/toast';
import { ParseRule } from '@/types';
import { fileToBase64 } from '@/lib/parser/file-reader';
import { Play, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function ImportPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    file, fileName, fileType, fileData,
    selectedRuleId, isParsing, parseProgress, parseProgressText,
    records, parseError,
    setFile, setFileData, setSelectedRuleId,
    setParsing, setParseProgress, setRecords, setParseError,
    reset,
  } = useImportStore();

  const { rules, setRules, addRule } = useRuleStore();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [fileContent, setFileContent] = useState('');

  // Load rules on mount
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const base64 = await fileToBase64(selectedFile);
      setFileData(base64);

      // Read file content for AI analysis
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        let text = '';
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][];
          text += `--- Sheet: ${sheetName} ---\n`;
          text += data.slice(0, 50).map(r => r.join('\t')).join('\n') + '\n\n';
        }
        setFileContent(text);
      } else {
        // For Word/PDF, content will be extracted server-side
        setFileContent(`[文件内容将在AI分析时由服务端提取] 文件名: ${selectedFile.name}`);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setFileData('');
    setFileContent('');
    setParseError(null);
  }, []);

  const handleParse = useCallback(async () => {
    if (!fileData || !selectedRuleId) {
      showToast('请先选择文件和解析规则', 'error');
      return;
    }

    setParsing(true);
    setParseProgress(0.1, '准备解析...');
    setParseError(null);

    try {
      setParseProgress(0.3, '上传文件...');
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          fileName,
          ruleId: selectedRuleId,
        }),
      });

      setParseProgress(0.8, '解析数据...');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '解析失败');
      }

      const data = await response.json();
      setParseProgress(1, '解析完成');
      setRecords(data.records);

      showToast(`解析完成：${data.stats.success} 条成功，${data.stats.failed} 条有错误`,
        data.stats.failed > 0 ? 'info' : 'success');
    } catch (error) {
      setParseError(error instanceof Error ? error.message : '解析失败');
      showToast('解析失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setParsing(false);
    }
  }, [fileData, fileName, selectedRuleId]);

  const handleRuleGenerated = useCallback((rule: ParseRule, notes: string[]) => {
    addRule(rule);
    setSelectedRuleId(rule.id);
    showToast('AI 规则已生成，请确认后使用', 'success');
  }, []);

  const handleAIGenerate = useCallback(async () => {
    if (!file) {
      showToast('请先上传文件', 'error');
      return;
    }
    // Ensure fileContent is ready for AI
    if (!fileContent) {
      try {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const XLSX = await import('xlsx');
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          let text = '';
          for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][];
            text += `--- Sheet: ${sheetName} ---\n`;
            text += data.slice(0, 50).map(r => r.join('\t')).join('\n') + '\n\n';
          }
          setFileContent(text);
        } else {
          setFileContent(`[文件内容将在AI分析时由服务端提取] 文件名: ${file.name}`);
        }
      } catch (e) {
        showToast('读取文件内容失败', 'error');
        return;
      }
    }
    setShowAIDialog(true);
  }, [file, fileContent]);

  const stats = records.length > 0 ? {
    total: records.length,
    success: records.filter(r => r.errors.length === 0).length,
    failed: records.filter(r => r.errors.length > 0).length,
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">文件导入</h1>
        <p className="text-sm text-muted-foreground mt-1">上传出库单文件，选择解析规则，完成批量导入</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <FileUploader
            onFileSelect={handleFileSelect}
            selectedFile={file}
            onClear={handleClearFile}
          />

          <ParseProgress
            isParsing={isParsing}
            progress={parseProgress}
            progressText={parseProgressText}
          />

          {parseError && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{parseError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {stats && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm">成功 <strong>{stats.success}</strong> 条</span>
                  </div>
                  {stats.failed > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="text-sm">错误 <strong>{stats.failed}</strong> 条</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <Button onClick={() => router.push('/preview')} className="gap-1">
                      查看数据
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <RuleSelector
            rules={rules}
            selectedRuleId={selectedRuleId}
            onRuleSelect={setSelectedRuleId}
            onNewRule={() => router.push('/rules/new')}
            onAIGenerate={handleAIGenerate}
          />

          <Button
            className="w-full"
            size="lg"
            onClick={handleParse}
            disabled={!file || !selectedRuleId || isParsing}
          >
            {isParsing ? '解析中...' : '开始解析'}
            {!isParsing && <Play className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>

      <AIRuleDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        fileContent={fileContent}
        fileName={fileName}
        fileType={fileType}
        onRuleGenerated={handleRuleGenerated}
      />
    </div>
  );
}
