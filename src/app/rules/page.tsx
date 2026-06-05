'use client';

import { useState, useEffect, useCallback } from 'react';
import { RuleCard } from '@/components/rules/rule-card';
import { RuleEditor } from '@/components/rules/rule-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRuleStore } from '@/stores/rule-store';
import { useToast } from '@/components/ui/toast';
import { ParseRule } from '@/types';
import { Plus, Search } from 'lucide-react';

export default function RulesPage() {
  const { rules, setRules, addRule, updateRule, removeRule } = useRuleStore();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<ParseRule | null | 'new'>(null);

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

  const handleSave = useCallback(async (rule: ParseRule) => {
    try {
      const isNew = !rules.find(r => r.id === rule.id);
      const url = isNew ? '/api/rules' : `/api/rules/${rule.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule }),
      });

      if (!response.ok) throw new Error('保存失败');

      const data = await response.json();
      if (isNew) {
        addRule(data.rule);
      } else {
        updateRule(rule.id, data.rule);
      }
      setEditingRule(null);
      showToast('规则保存成功', 'success');
    } catch (error) {
      showToast('保存失败', 'error');
    }
  }, [rules]);

  const handleDelete = useCallback(async (ruleId: string) => {
    if (!confirm('确定要删除此规则吗？')) return;
    try {
      const response = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败');
      removeRule(ruleId);
      showToast('规则已删除', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  }, []);

  const handleDuplicate = useCallback(async (rule: ParseRule) => {
    const newRule: ParseRule = {
      ...rule,
      id: '', // Will be generated server-side
      name: `${rule.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: newRule }),
      });
      if (!response.ok) throw new Error('复制失败');
      const data = await response.json();
      addRule(data.rule);
      showToast('规则已复制', 'success');
    } catch (error) {
      showToast('复制失败', 'error');
    }
  }, []);

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (editingRule !== null) {
    return (
      <RuleEditor
        rule={editingRule === 'new' ? null : editingRule}
        onSave={handleSave}
        onCancel={() => setEditingRule(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">解析规则管理</h1>
          <p className="text-sm text-muted-foreground mt-1">配置和管理文件解析规则，支持 AI 辅助生成</p>
        </div>
        <Button onClick={() => setEditingRule('new')}>
          <Plus className="h-4 w-4 mr-1" /> 新建规则
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索规则..."
          className="pl-9"
        />
      </div>

      {filteredRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={setEditingRule}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onPreview={() => showToast('预览功能：请先在文件导入页上传文件后测试', 'info')}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无解析规则</p>
          <Button className="mt-4" onClick={() => setEditingRule('new')}>
            <Plus className="h-4 w-4 mr-1" /> 创建第一条规则
          </Button>
        </div>
      )}
    </div>
  );
}
