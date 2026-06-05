'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ParseRule } from '@/types';

interface AIRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileContent: string;
  fileName: string;
  fileType: string;
  onRuleGenerated: (rule: ParseRule, notes: string[]) => void;
}

export function AIRuleDialog({
  open,
  onOpenChange,
  fileContent,
  fileName,
  fileType,
  onRuleGenerated,
}: AIRuleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userHints, setUserHints] = useState('');
  const [generatedRule, setGeneratedRule] = useState<ParseRule | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          fileName,
          fileType,
          userHints: userHints || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'AI 生成规则失败');
      }

      const data = await response.json();
      setGeneratedRule(data.rule);
      setNotes(data.notes || []);
      setConfidence(data.confidence || 'medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 生成规则失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (generatedRule) {
      onRuleGenerated(generatedRule, notes);
      handleClose();
    }
  };

  const handleClose = () => {
    setGeneratedRule(null);
    setNotes([]);
    setError(null);
    setUserHints('');
    onOpenChange(false);
  };

  const confidenceColors = {
    high: 'success' as const,
    medium: 'warning' as const,
    low: 'destructive' as const,
  };

  const confidenceLabels = {
    high: '高置信度',
    medium: '中等置信度',
    low: '低置信度',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 辅助生成解析规则
          </DialogTitle>
          <DialogDescription>
            AI 将分析文件结构并生成推荐的解析规则，您可以在此基础上微调确认
          </DialogDescription>
        </DialogHeader>

        {!generatedRule ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">补充说明（可选）</label>
              <Textarea
                value={userHints}
                onChange={(e) => setUserHints(e.target.value)}
                placeholder="例如：收货人信息在文件底部、门店名是列头横向排列..."
                rows={3}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    生成规则
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={confidenceColors[confidence]}>
                {confidenceLabels[confidence]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                规则名称：{generatedRule.name}
              </span>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">解析模式：{generatedRule.parseMode}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>跳过行数：{generatedRule.fileConfig.skipRows}</p>
                <p>表头行：{generatedRule.fileConfig.headerRow}</p>
                <p>数据起始行：{generatedRule.fileConfig.dataStartRow}</p>
                <p>字段映射数：{generatedRule.fieldMappings.length}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">字段映射</h4>
              <div className="space-y-1.5">
                {generatedRule.fieldMappings.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-md p-2 border">
                    <Badge variant="outline" className="text-xs">{m.targetField}</Badge>
                    <span className="text-muted-foreground">←</span>
                    <span>{m.sourceType}: {m.sourceValue}</span>
                    {m.confidence && (
                      <Badge
                        variant={m.confidence === 'high' ? 'success' : m.confidence === 'medium' ? 'warning' : 'destructive'}
                        className="text-xs ml-auto"
                      >
                        {m.confidence}
                      </Badge>
                    )}
                    {m.label && <span className="text-muted-foreground">({m.label})</span>}
                  </div>
                ))}
              </div>
            </div>

            {notes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  AI 推测说明
                </h4>
                <ul className="space-y-1">
                  {notes.map((note, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setGeneratedRule(null); setNotes([]); }}>
                重新生成
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" />
                确认使用此规则
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
