'use client';

import { Settings, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParseRule } from '@/types';

interface RuleSelectorProps {
  rules: ParseRule[];
  selectedRuleId: string;
  onRuleSelect: (ruleId: string) => void;
  onNewRule: () => void;
  onAIGenerate: () => void;
}

export function RuleSelector({
  rules,
  selectedRuleId,
  onRuleSelect,
  onNewRule,
  onAIGenerate,
}: RuleSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          选择解析规则
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedRuleId} onValueChange={onRuleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="请选择解析规则..." />
          </SelectTrigger>
          <SelectContent>
            {rules.map(rule => (
              <SelectItem key={rule.id} value={rule.id}>
                {rule.name} ({rule.parseMode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onNewRule} className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            手动新建
          </Button>
          <Button size="sm" onClick={onAIGenerate} className="flex-1">
            <Sparkles className="h-4 w-4 mr-1" />
            AI 生成规则
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
