import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/memory-store';

export async function GET() {
  try {
    const rules = await memoryStore.getRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule } = body;

    const newRule = await memoryStore.addRule(rule);
    return NextResponse.json({ rule: newRule });
  } catch (error) {
    console.error('Failed to create rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
