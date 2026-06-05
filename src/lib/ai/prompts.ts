export const SYSTEM_PROMPT = `你是一个物流出库单文件结构分析专家。你的任务是分析各种格式的出库单文件，识别其结构特征，并生成可执行的解析规则配置。

关键原则：
1. 你生成的规则将被解析引擎直接执行，因此必须精确、完整
2. 每个字段映射必须标注置信度（high/medium/low）
3. 对推测的映射必须添加说明
4. 规则必须通用，不能包含特定文件名的判断

支持的解析模式：
- table: 标准表格，按行解析，字段映射到列
- matrix: 矩阵转置，门店/日期作为列头横向排列，需转置为行记录
- card: 卡片式，每条记录是独立卡片区域，需按边界拆分
- text: 纯文本，按分隔符/正则从段落提取
- pdf: PDF文档，先提取文本再按规则解析

规则结构字段说明：
- fileConfig: 文件预处理（skipRows跳过头部行数, headerRow表头行0-based, dataStartRow数据起始行, dataEndRow数据结束行或'auto', sheetMode为single/all/named）
- fieldMappings: 字段映射数组，每项含targetField(目标字段名), sourceType(column/static/regex/position), sourceValue(列索引/静态值/正则/位置), confidence(high/medium/low)
- tailExtraction: 尾部信息提取（enabled, startOffset从数据区末尾偏移行数, patterns数组含field和pattern正则）
- aggregation: 聚合规则（enabled, groupByKey分组字段, sharedFields共享字段数组）
- transpose: 矩阵转置（enabled, pivotColumn透视列, valueStartColumn值起始列, pivotFieldName, valueFieldName, compositeSplit复合单元格拆分）
- card: 卡片式（startPattern起始标志正则, fieldPatterns字段提取模式, tableStartPattern, tableEndPattern）
- text: 纯文本（recordSeparator记录分隔正则, fieldPatterns字段提取模式, itemPattern物品行正则）
- defaults: 默认值对象`;

export function buildAnalyzePrompt(fileName: string, fileType: string, fileContent: string): string {
  return `请分析以下文件的结构特征，并生成解析规则。

## 文件信息
- 文件名：${fileName}
- 文件类型：${fileType}

## 文件内容（前150行）
${fileContent.split('\n').slice(0, 150).join('\n')}

## 需要提取的目标字段
- externalCode: 外部编码（外部系统订单唯一编号）
- storeName: 收货门店名称
- receiverName: 收件人姓名
- receiverPhone: 收件人电话
- receiverAddress: 收件人地址
- skuCode: SKU物品编码
- skuName: SKU物品名称
- skuQuantity: SKU发货数量（正数）
- skuSpec: SKU规格型号
- remark: 备注

## 请返回JSON格式的分析结果
{
  "analysis": {
    "fileType": "文件类型描述",
    "structure": "结构特征描述",
    "headerRow": 表头行号,
    "dataRows": "数据行范围描述",
    "parseMode": "推荐的解析模式",
    "specialFeatures": ["特殊处理需求列表"],
    "fields": [
      { "field": "字段名", "suggestedSource": "建议来源", "confidence": "high/medium/low", "note": "说明" }
    ]
  },
  "suggestedRule": { 完整的ParseRule配置对象 }
}`;
}

export function buildRuleGeneratePrompt(fileName: string, fileType: string, fileContent: string, userHints?: string): string {
  return `请为以下文件生成完整的解析规则配置。

## 文件信息
- 文件名：${fileName}
- 文件类型：${fileType}
${userHints ? `\n## 用户补充说明\n${userHints}\n` : ''}

## 文件内容
${fileContent.split('\n').slice(0, 200).join('\n')}

## 目标字段
externalCode, storeName, receiverName, receiverPhone, receiverAddress, skuCode, skuName, skuQuantity, skuSpec, remark

## 请返回JSON格式的规则
{
  "rule": { 完整的ParseRule配置 },
  "confidence": "high/medium/low",
  "notes": ["AI标注的推测说明列表"]
}

确保：
1. 每个fieldMapping都标注confidence
2. 对推测的映射添加说明到notes
3. 规则可直接用于解析引擎执行
4. 不包含任何文件名判断或硬编码`;
}
