'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ParseProgressProps {
  isParsing: boolean;
  progress: number;
  progressText: string;
}

export function ParseProgress({ isParsing, progress, progressText }: ParseProgressProps) {
  if (!isParsing) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <span className="text-sm font-medium">正在解析文件...</span>
          <span className="text-sm text-muted-foreground ml-auto">{progressText}</span>
        </div>
        <Progress value={progress * 100} />
      </CardContent>
    </Card>
  );
}
