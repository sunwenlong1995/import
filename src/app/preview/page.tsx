'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Input, Space, Card, ConfigProvider, Tag, Tooltip, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, SendOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useImportStore } from '@/stores/import-store';
import { useToast } from '@/components/ui/toast';
import { exportToExcel } from '@/lib/utils/excel-export';
import { validateRecord, validateRecords as validateAllRecords } from '@/lib/parser/validators';
import { ParsedRecord, WAYBILL_FIELDS, WaybillFieldKey } from '@/types';

export default function PreviewPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { records, fileName, setRecords } = useImportStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-validate on mount
  useEffect(() => {
    if (records.length > 0) {
      const validated = validateAllRecords([...records.map(r => ({ ...r }))]);
      setRecords(validated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const errorCount = records.filter(r => r.errors.length > 0).length;
  const duplicateCount = records.filter(r => r.isDuplicate).length;
  const canSubmit = errorCount === 0 && records.length > 0;

  const handleUpdateRecord = useCallback((index: number, field: string, value: any) => {
    setRecords(currentRecords => {
      const updated = [...currentRecords];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
        updated[index].errors = validateRecord(updated[index]);
        const fullValidated = validateAllRecords(updated);
        return fullValidated;
      }
      return updated;
    });
  }, [setRecords]);

  const handleDeleteRecord = useCallback((index: number) => {
    setRecords(currentRecords => {
      const updated = currentRecords.filter((_, i) => i !== index);
      return validateAllRecords(updated.map((r, i) => ({ ...r, rowIndex: i + 1 })));
    });
    showToast('已删除一行', 'info');
  }, [setRecords, showToast]);

  const handleAddRecord = useCallback(() => {
    setRecords(currentRecords => {
      const newRecord: ParsedRecord = {
        rowIndex: currentRecords.length + 1,
        externalCode: '',
        storeName: '',
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        skuCode: '',
        skuName: '',
        skuQuantity: 0,
        skuSpec: '',
        remark: '',
        errors: [],
      };
      newRecord.errors = validateRecord(newRecord);
      return validateAllRecords([...currentRecords, newRecord]);
    });
    showToast('已新增一行', 'info');
  }, [setRecords, showToast]);

  const handleExport = useCallback(() => {
    if (records.length === 0) {
      showToast('没有数据可以导出', 'error');
      return;
    }
    try {
      exportToExcel(records, fileName || '导出数据');
      showToast(`成功导出 ${records.length} 条记录`, 'success');
    } catch (error) {
      showToast('导出失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  }, [records, fileName, showToast]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      showToast('请先修正所有错误', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waybills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          batchId: `batch_${Date.now()}`,
          fileName: fileName || 'unknown',
        }),
      });
      if (!response.ok) throw new Error('提交失败');
      const data = await response.json();
      showToast(`提交完成：成功 ${data.success || records.length} 条`, 'success');
      router.push('/waybills');
    } catch (error) {
      showToast('提交失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, records, fileName, router, showToast]);

  const columns: ColumnsType<ParsedRecord> = useMemo(() => [
    {
      title: '#',
      width: 50,
      fixed: 'left',
      render: (_, __, index) => index + 1,
    },
    ...WAYBILL_FIELDS.map(field => ({
      title: (
        <span>
          {field.label}
          {field.required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
        </span>
      ),
      dataIndex: field.key,
      key: field.key,
      width: field.key === 'receiverAddress' ? 200 : field.key === 'skuName' ? 160 : 130,
      render: (value: any, record: ParsedRecord, index: number) => {
        const errors = record.errors.filter(e => e.field === field.key);
        const hasError = errors.length > 0;

        return (
          <Tooltip title={hasError ? errors.map(e => e.message).join('；') : ''} color="#ff4d4f">
            <Input
              size="small"
              variant="borderless"
              value={value ?? ''}
              type={field.key === 'skuQuantity' ? 'number' : 'text'}
              status={hasError ? 'error' : undefined}
              style={{
                padding: '0 4px',
                minWidth: 60,
                backgroundColor: hasError ? '#fff2f0' : record.isDuplicate ? '#fffbe6' : undefined,
              }}
              onChange={e => {
                const processedValue = field.key === 'skuQuantity' ? (parseFloat(e.target.value) || 0) : e.target.value;
                handleUpdateRecord(index, field.key, processedValue);
              }}
              onPressEnter={e => (e.target as HTMLInputElement).blur()}
            />
          </Tooltip>
        );
      },
    })),
    {
      title: '操作',
      width: 70,
      fixed: 'right',
      render: (_, __, index) => (
        <Popconfirm title="确定删除此行？" onConfirm={() => handleDeleteRecord(index)} okText="确定" cancelText="取消">
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ], [handleUpdateRecord, handleDeleteRecord]);

  const errorsSummary = records
    .map((r, i) => ({ row: i + 1, errors: r.errors }))
    .filter(r => r.errors.length > 0);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0fc6c2',
          borderRadius: 4,
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/')} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>数据预览与编辑</h1>
              <p style={{ fontSize: 13, color: '#909399', margin: 0 }}>
                {fileName ? `文件: ${fileName} · ` : ''}共 {records.length} 条记录
              </p>
            </div>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={records.length === 0}>
              导出 Excel
            </Button>
            <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
              提交下单 ({records.length})
            </Button>
          </Space>
        </div>

        {/* Stats bar */}
        <Card size="small">
          <Space size={16} wrap>
            <Tag>共 {records.length} 条记录</Tag>
            {errorCount > 0 && (
              <Tooltip title="点击查看错误详情">
                <Tag color="error" style={{ cursor: 'pointer' }}>
                  <AlertOutlined /> {errorCount} 条有错误
                </Tag>
              </Tooltip>
            )}
            {duplicateCount > 0 && (
              <Tag color="warning">{duplicateCount} 条重复</Tag>
            )}
            {errorCount === 0 && records.length > 0 && (
              <Tag color="success"><CheckCircleOutlined /> 校验通过，可以提交</Tag>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddRecord}>新增空行</Button>
            </div>
          </Space>
        </Card>

        {/* Error details */}
        {errorsSummary.length > 0 && (
          <Card size="small" style={{ borderColor: '#ffccc7', backgroundColor: '#fff2f0' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#ff4d4f', marginBottom: 8 }}>错误详情：</p>
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {errorsSummary.slice(0, 20).map(({ row, errors }) => (
                <div key={row} style={{ fontSize: 12, color: '#ff4d4f' }}>
                  <span style={{ fontWeight: 500 }}>第{row}行：</span>
                  {errors.map(e => e.message).join('；')}
                </div>
              ))}
              {errorsSummary.length > 20 && (
                <div style={{ fontSize: 12, color: '#ff4d4f' }}>...还有 {errorsSummary.length - 20} 条错误</div>
              )}
            </div>
          </Card>
        )}

        {/* Data table */}
        {records.length > 0 ? (
          <Table<ParsedRecord>
            columns={columns}
            dataSource={records}
            rowKey={(_, index) => String(index)}
            size="small"
            bordered
            pagination={{
              pageSize: 100,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['50', '100', '200', '500'],
              showTotal: (t) => `共 ${t} 条`,
              size: 'small',
            }}
            scroll={{ x: 1500, y: 'calc(100vh - 380px)' }}
            locale={{ emptyText: '暂无数据' }}
            rowClassName={(record) => record.isDuplicate ? 'ant-table-row-duplicate' : ''}
          />
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#909399', marginBottom: 16 }}>暂无解析数据</p>
              <Button type="primary" onClick={() => router.push('/')}>返回文件导入页面</Button>
            </div>
          </Card>
        )}
      </div>
    </ConfigProvider>
  );
}
