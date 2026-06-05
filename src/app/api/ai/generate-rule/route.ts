import { NextRequest, NextResponse } from 'next/server';
import { generateRule } from '@/lib/ai/rule-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, fileName, fileType, userHints } = body;

    if (!fileContent || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await generateRule(fileName, fileType, fileContent, userHints);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI generate rule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI rule generation failed' },
      { status: 500 }
    );
  }
}
