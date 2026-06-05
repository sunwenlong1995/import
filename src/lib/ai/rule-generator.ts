import { chatCompletion, parseJSONResponse } from './client';
import { SYSTEM_PROMPT, buildAnalyzePrompt, buildRuleGeneratePrompt } from './prompts';
import { ParseRule } from '@/types';

export async function analyzeFile(
  fileName: string,
  fileType: string,
  fileContent: string
): Promise<{
  analysis: any;
  suggestedRule: ParseRule;
}> {
  const prompt = buildAnalyzePrompt(fileName, fileType, fileContent);
  const response = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);

  const result = parseJSONResponse(response.content);
  return {
    analysis: result.analysis,
    suggestedRule: result.suggestedRule,
  };
}

export async function generateRule(
  fileName: string,
  fileType: string,
  fileContent: string,
  userHints?: string
): Promise<{
  rule: ParseRule;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}> {
  const prompt = buildRuleGeneratePrompt(fileName, fileType, fileContent, userHints);
  const response = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);

  const result = parseJSONResponse(response.content);
  return {
    rule: result.rule,
    confidence: result.confidence || 'medium',
    notes: result.notes || [],
  };
}
