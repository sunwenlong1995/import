'use client';

import { ParseRule } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Edit, Copy, Trash2, Eye } from 'lucide-react';

interface RuleCardProps {
  rule: ParseRule;
  onEdit: (rule: ParseRule) => void;
  onDuplicate: (rule: ParseRule) => void;
  onDelete: (ruleId: string) => void;
  onPreview: (rule: ParseRule) => void;
}

export function RuleCard({ rule, onEdit, onDuplicate, onDelete, onPreview }: RuleCardProps) {
  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{rule.name}</CardTitle>
            {rule.description && (
              <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
            )}
          </div>
          <Badge variant="secondary">{rule.parseMode}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            创建于 {formatDate(rule.createdAt)}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onPreview(rule)} title="预览测试">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} title="编辑">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDuplicate(rule)} title="复制">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(rule.id)} title="删除" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {rule.fieldMappings.slice(0, 5).map((m, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {m.targetField}
              {m.confidence && m.confidence !== 'high' && (
                <span className="ml-1 text-yellow-500">?</span>
              )}
            </Badge>
          ))}
          {rule.fieldMappings.length > 5 && (
            <Badge variant="outline" className="text-xs">+{rule.fieldMappings.length - 5}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
