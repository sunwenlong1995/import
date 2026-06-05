import { NextRequest, NextResponse } from 'next/server';
import { analyzeFile } from '@/lib/ai/rule-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, fileName, fileType } = body;

    if (!fileContent || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await analyzeFile(fileName, fileType, fileContent);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI analysis failed' },
      { status: 500 }
    );
  }
}
