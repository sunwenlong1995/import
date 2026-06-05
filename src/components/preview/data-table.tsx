'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ParsedRecord, WAYBILL_FIELDS, WaybillFieldKey } from '@/types';
import { validateRecord } from '@/lib/parser/validators';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface DataTableProps {
  records: ParsedRecord[];
  onUpdateRecord: (index: number, field: string, value: any) => void;
  onDeleteRecord: (index: number) => void;
  onAddRecord: () => void;
}

export function DataTable({ records, onUpdateRecord, onDeleteRecord, onAddRecord }: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20,
  });

  const handleCellEdit = useCallback((index: number, field: WaybillFieldKey, value: string) => {
    const processedValue = field === 'skuQuantity' ? (parseFloat(value) || 0) : value;
    onUpdateRecord(index, field, processedValue);
  }, [onUpdateRecord]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number, fieldIdx: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextFieldIdx = e.shiftKey ? fieldIdx - 1 : fieldIdx + 1;
      if (nextFieldIdx >= 0 && nextFieldIdx < WAYBILL_FIELDS.length) {
        const nextField = WAYBILL_FIELDS[nextFieldIdx].key;
        const cell = document.querySelector(`[data-row="${index}"][data-field="${nextField}"] input`) as HTMLInputElement;
        cell?.focus();
        cell?.select();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const getFieldErrors = useCallback((record: ParsedRecord, fieldKey: string) => {
    return record.errors.filter(e => e.field === fieldKey);
  }, []);

  const columnWidths: Record<string, string> = useMemo(() => ({
    externalCode: 'w-28',
    storeName: 'w-36',
    receiverName: 'w-24',
    receiverPhone: 'w-28',
    receiverAddress: 'w-48',
    skuCode: 'w-28',
    skuName: 'w-32',
    skuQuantity: 'w-24',
    skuSpec: 'w-28',
    remark: 'w-32',
  }), []);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Fixed header */}
      <div className="flex bg-muted border-b sticky top-0 z-10">
        <div className="w-12 shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground border-r">#</div>
        {WAYBILL_FIELDS.map(field => (
          <div key={field.key} className={cn(columnWidths[field.key], 'shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground border-r last:border-r-0 truncate')}>
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </div>
        ))}
        <div className="w-16 shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground">操作</div>
      </div>

      {/* Virtual scrolling body */}
      <div ref={parentRef} className="overflow-auto" style={{ height: 'calc(100vh - 320px)', minHeight: '300px' }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const record = records[virtualRow.index];
            if (!record) return null;

            return (
              <div
                key={virtualRow.index}
                className={cn(
                  'flex absolute top-0 left-0 w-full border-b hover:bg-primary-50/30 transition-colors',
                  record.isDuplicate && 'bg-yellow-50',
                  virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                )}
                style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
              >
                <div className="w-12 shrink-0 px-2 py-1 text-xs text-muted-foreground border-r flex items-center">
                  {virtualRow.index + 1}
                </div>
                {WAYBILL_FIELDS.map((field, fieldIdx) => {
                  const errors = getFieldErrors(record, field.key);
                  const hasError = errors.length > 0;
                  const value = (record as any)[field.key] ?? '';

                  return (
                    <div
                      key={field.key}
                      data-row={virtualRow.index}
                      data-field={field.key}
                      className={cn(
                        columnWidths[field.key], 'shrink-0 px-1 py-0.5 border-r last:border-r-0 relative',
                        hasError && 'bg-red-50',
                      )}
                    >
                      <input
                        type={field.key === 'skuQuantity' ? 'number' : 'text'}
                        value={value}
                        onChange={e => handleCellEdit(virtualRow.index, field.key as WaybillFieldKey, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, virtualRow.index, fieldIdx)}
                        className={cn(
                          'w-full h-full px-1 py-1 text-xs bg-transparent border border-transparent rounded focus:border-primary focus:outline-none transition-colors',
                          hasError && 'border-destructive/50 focus:border-destructive',
                        )}
                      />
                      {hasError && (
                        <div className="absolute bottom-0 right-0">
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        </div>
                      )}
                      {hasError && (
                        <div className="absolute left-0 top-full z-50 bg-destructive text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap hidden group-hover:block">
                          {errors.map(e => e.message).join('; ')}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="w-16 shrink-0 px-1 py-1 flex items-center justify-center">
                  <button
                    onClick={() => onDeleteRecord(virtualRow.index)}
                    className="text-xs text-destructive hover:text-destructive/80 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-t text-xs text-muted-foreground">
        <span>共 {records.length} 条记录</span>
        <button
          onClick={onAddRecord}
          className="text-primary hover:underline font-medium"
        >
          + 新增空行
        </button>
      </div>
    </div>
  );
}
