'use client';

import { useState } from 'react';
import { ParseRule, FieldMapping, FileConfig, TailExtraction, Aggregation, Transpose, CardConfig, TextConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { generateId } from '@/lib/utils';

interface RuleEditorProps {
  rule: ParseRule | null;
  onSave: (rule: ParseRule) => void;
  onCancel: () => void;
}

const TARGET_FIELDS = [
  'externalCode', 'storeName', 'receiverName', 'receiverPhone',
  'receiverAddress', 'skuCode', 'skuName', 'skuQuantity', 'skuSpec', 'remark',
];

const FIELD_LABELS: Record<string, string> = {
  externalCode: '外部编码', storeName: '收货门店', receiverName: '收件人姓名',
  receiverPhone: '收件人电话', receiverAddress: '收件人地址', skuCode: 'SKU物品编码',
  skuName: 'SKU物品名称', skuQuantity: 'SKU发货数量', skuSpec: 'SKU规格型号', remark: '备注',
};

export function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [parseMode, setParseMode] = useState<ParseRule['parseMode']>(rule?.parseMode || 'table');
  const [fileConfig, setFileConfig] = useState<FileConfig>(rule?.fileConfig || {
    skipRows: 0, headerRow: 0, dataStartRow: 1, dataEndRow: 'auto', sheetMode: 'single',
  });
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(rule?.fieldMappings || []);
  const [tailExtraction, setTailExtraction] = useState<TailExtraction>(rule?.tailExtraction || { enabled: false, startOffset: 3, patterns: [] });
  const [aggregation, setAggregation] = useState<Aggregation>(rule?.aggregation || { enabled: false, groupByKey: '', sharedFields: [] });
  const [transpose, setTranspose] = useState<Transpose>(rule?.transpose || { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: 'storeName', valueFieldName: 'skuQuantity' });
  const [cardConfig, setCardConfig] = useState<CardConfig>(rule?.card || { startPattern: '', fieldPatterns: [] });
  const [textConfig, setTextConfig] = useState<TextConfig>(rule?.text || { recordSeparator: '', fieldPatterns: [] });
  const [defaults, setDefaults] = useState<Record<string, string>>(rule?.defaults || {});

  const addFieldMapping = () => {
    setFieldMappings([...fieldMappings, { targetField: '', sourceType: 'column', sourceValue: '', confidence: 'medium' }]);
  };

  const updateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setFieldMappings(newMappings);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const savedRule: ParseRule = {
      id: rule?.id || generateId(),
      name,
      description,
      createdAt: rule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parseMode,
      fileConfig,
      fieldMappings,
      tailExtraction: tailExtraction.enabled ? tailExtraction : undefined,
      aggregation: aggregation.enabled ? aggregation : undefined,
      transpose: transpose.enabled ? transpose : undefined,
      card: parseMode === 'card' ? cardConfig : undefined,
      text: parseMode === 'text' || parseMode === 'pdf' ? textConfig : undefined,
      defaults: Object.keys(defaults).length > 0 ? defaults : undefined,
    };
    onSave(savedRule);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{rule ? '编辑规则' : '新建规则'}</h2>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="file">文件配置</TabsTrigger>
          <TabsTrigger value="fields">字段映射</TabsTrigger>
          <TabsTrigger value="advanced">高级配置</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">规则名称</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入规则名称" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">描述</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="规则描述" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">解析模式</label>
                <Select value={parseMode} onValueChange={v => setParseMode(v as ParseRule['parseMode'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">标准表格 (table)</SelectItem>
                    <SelectItem value="matrix">矩阵转置 (matrix)</SelectItem>
                    <SelectItem value="card">卡片式 (card)</SelectItem>
                    <SelectItem value="text">纯文本 (text)</SelectItem>
                    <SelectItem value="pdf">PDF文档 (pdf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">文件预处理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">跳过头部行数</label>
                  <Input type="number" value={fileConfig.skipRows} onChange={e => setFileConfig({...fileConfig, skipRows: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">表头行 (0-based)</label>
                  <Input type="number" value={fileConfig.headerRow} onChange={e => setFileConfig({...fileConfig, headerRow: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">数据起始行</label>
                  <Input type="number" value={fileConfig.dataStartRow} onChange={e => setFileConfig({...fileConfig, dataStartRow: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">数据结束行</label>
                  <Select value={String(fileConfig.dataEndRow)} onValueChange={v => setFileConfig({...fileConfig, dataEndRow: v === 'auto' ? 'auto' : parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动检测</SelectItem>
                      <SelectItem value="100">100行</SelectItem>
                      <SelectItem value="500">500行</SelectItem>
                      <SelectItem value="1000">1000行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Sheet 处理模式</label>
                <Select value={fileConfig.sheetMode} onValueChange={v => setFileConfig({...fileConfig, sheetMode: v as FileConfig['sheetMode']})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">仅第一个Sheet</SelectItem>
                    <SelectItem value="all">所有Sheet</SelectItem>
                    <SelectItem value="named">指定Sheet名称</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">字段映射</CardTitle>
                <Button size="sm" variant="outline" onClick={addFieldMapping}>
                  <Plus className="h-3 w-3 mr-1" /> 添加映射
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {fieldMappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                  <Select value={mapping.targetField} onValueChange={v => updateFieldMapping(index, { targetField: v })}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="目标字段" /></SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map(f => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={mapping.sourceType} onValueChange={v => updateFieldMapping(index, { sourceType: v as FieldMapping['sourceType'] })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="column">列索引</SelectItem>
                      <SelectItem value="static">静态值</SelectItem>
                      <SelectItem value="regex">正则</SelectItem>
                      <SelectItem value="position">位置</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={mapping.sourceValue}
                    onChange={e => updateFieldMapping(index, { sourceValue: e.target.value })}
                    placeholder={mapping.sourceType === 'column' ? '列索引(0-based)' : mapping.sourceType === 'regex' ? '正则表达式' : '值'}
                  />
                  <Select value={mapping.confidence || 'medium'} onValueChange={v => updateFieldMapping(index, { confidence: v as FieldMapping['confidence'] })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeFieldMapping(index)} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {fieldMappings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">暂无字段映射，点击&ldquo;添加映射&rdquo;开始配置</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {/* Tail Extraction */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">尾部信息提取</CardTitle>
                <Badge variant={tailExtraction.enabled ? 'default' : 'secondary'}>
                  {tailExtraction.enabled ? '已启用' : '未启用'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tailExtraction.enabled} onChange={e => setTailExtraction({...tailExtraction, enabled: e.target.checked})} className="rounded" />
                启用尾部信息提取
              </label>
              {tailExtraction.enabled && (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1 block">从数据区末尾偏移行数</label>
                    <Input type="number" value={tailExtraction.startOffset} onChange={e => setTailExtraction({...tailExtraction, startOffset: parseInt(e.target.value) || 3})} />
                  </div>
                  <div className="space-y-2">
                    {tailExtraction.patterns.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={p.field} onChange={e => {
                          const patterns = [...tailExtraction.patterns];
                          patterns[i] = { ...patterns[i], field: e.target.value };
                          setTailExtraction({...tailExtraction, patterns});
                        }} placeholder="字段名" className="w-32" />
                        <Input value={p.pattern} onChange={e => {
                          const patterns = [...tailExtraction.patterns];
                          patterns[i] = { ...patterns[i], pattern: e.target.value };
                          setTailExtraction({...tailExtraction, patterns});
                        }} placeholder="正则表达式" className="flex-1" />
                        <Input type="number" value={p.rowOffset} onChange={e => {
                          const patterns = [...tailExtraction.patterns];
                          patterns[i] = { ...patterns[i], rowOffset: parseInt(e.target.value) || 0 };
                          setTailExtraction({...tailExtraction, patterns});
                        }} placeholder="行偏移" className="w-20" />
                        <Button variant="ghost" size="icon" onClick={() => {
                          setTailExtraction({...tailExtraction, patterns: tailExtraction.patterns.filter((_, j) => j !== i)});
                        }} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => {
                      setTailExtraction({...tailExtraction, patterns: [...tailExtraction.patterns, { field: '', pattern: '', rowOffset: 0 }]});
                    }}><Plus className="h-3 w-3 mr-1" /> 添加提取模式</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Aggregation */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">跨行聚合</CardTitle>
                <Badge variant={aggregation.enabled ? 'default' : 'secondary'}>
                  {aggregation.enabled ? '已启用' : '未启用'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={aggregation.enabled} onChange={e => setAggregation({...aggregation, enabled: e.target.checked})} className="rounded" />
                启用跨行聚合
              </label>
              {aggregation.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">分组键字段</label>
                    <Input value={aggregation.groupByKey} onChange={e => setAggregation({...aggregation, groupByKey: e.target.value})} placeholder="如: externalCode" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">共享字段(逗号分隔)</label>
                    <Input value={aggregation.sharedFields.join(',')} onChange={e => setAggregation({...aggregation, sharedFields: e.target.value.split(',').filter(Boolean)})} placeholder="如: storeName,receiverName" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transpose */}
          {(parseMode === 'matrix') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">矩阵转置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={transpose.enabled} onChange={e => setTranspose({...transpose, enabled: e.target.checked})} className="rounded" />
                  启用矩阵转置
                </label>
                {transpose.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">透视列索引</label>
                      <Input type="number" value={transpose.pivotColumn} onChange={e => setTranspose({...transpose, pivotColumn: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">值起始列索引</label>
                      <Input type="number" value={transpose.valueStartColumn} onChange={e => setTranspose({...transpose, valueStartColumn: parseInt(e.target.value) || 2})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">透视列字段名</label>
                      <Input value={transpose.pivotFieldName} onChange={e => setTranspose({...transpose, pivotFieldName: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">值字段名</label>
                      <Input value={transpose.valueFieldName} onChange={e => setTranspose({...transpose, valueFieldName: e.target.value})} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card Config */}
          {parseMode === 'card' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">卡片式配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">卡片起始标志正则</label>
                  <Input value={cardConfig.startPattern} onChange={e => setCardConfig({...cardConfig, startPattern: e.target.value})} placeholder="如: ▶\\s*调拨记录" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium block">卡片内字段提取模式</label>
                  {cardConfig.fieldPatterns.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={p.field} onChange={e => {
                        const patterns = [...cardConfig.fieldPatterns];
                        patterns[i] = { ...patterns[i], field: e.target.value };
                        setCardConfig({...cardConfig, fieldPatterns: patterns});
                      }} placeholder="字段名" className="w-32" />
                      <Input value={p.pattern} onChange={e => {
                        const patterns = [...cardConfig.fieldPatterns];
                        patterns[i] = { ...patterns[i], pattern: e.target.value };
                        setCardConfig({...cardConfig, fieldPatterns: patterns});
                      }} placeholder="正则" className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setCardConfig({...cardConfig, fieldPatterns: cardConfig.fieldPatterns.filter((_, j) => j !== i)});
                      }} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    setCardConfig({...cardConfig, fieldPatterns: [...cardConfig.fieldPatterns, { field: '', pattern: '' }]});
                  }}><Plus className="h-3 w-3 mr-1" /> 添加</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Config */}
          {(parseMode === 'text' || parseMode === 'pdf') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">纯文本配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">记录分隔正则</label>
                  <Input value={textConfig.recordSeparator} onChange={e => setTextConfig({...textConfig, recordSeparator: e.target.value})} placeholder="如: ━━━|\\n{3,}" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">物品行正则(可选)</label>
                  <Input value={textConfig.itemPattern || ''} onChange={e => setTextConfig({...textConfig, itemPattern: e.target.value})} placeholder="如: \\d+\\.\\s*(.+?)\\|\\s*(.+?)\\|\\s*(.+?)\\|\\s*(\\d+)" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium block">字段提取模式</label>
                  {textConfig.fieldPatterns.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={p.field} onChange={e => {
                        const patterns = [...textConfig.fieldPatterns];
                        patterns[i] = { ...patterns[i], field: e.target.value };
                        setTextConfig({...textConfig, fieldPatterns: patterns});
                      }} placeholder="字段名" className="w-32" />
                      <Input value={p.pattern} onChange={e => {
                        const patterns = [...textConfig.fieldPatterns];
                        patterns[i] = { ...patterns[i], pattern: e.target.value };
                        setTextConfig({...textConfig, fieldPatterns: patterns});
                      }} placeholder="正则" className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setTextConfig({...textConfig, fieldPatterns: textConfig.fieldPatterns.filter((_, j) => j !== i)});
                      }} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => {
                    setTextConfig({...textConfig, fieldPatterns: [...textConfig.fieldPatterns, { field: '', pattern: '' }]});
                  }}><Plus className="h-3 w-3 mr-1" /> 添加</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSave} disabled={!name}>
          <Save className="h-4 w-4 mr-1" /> 保存规则
        </Button>
      </div>
    </div>
  );
}
