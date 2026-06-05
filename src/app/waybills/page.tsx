'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, DatePicker, Space, Card, Row, Col, ConfigProvider } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Waybill } from '@/types';
import { WAYBILL_FIELDS } from '@/types';
import { formatDate } from '@/lib/utils';

const { RangePicker } = DatePicker;

export default function WaybillsPage() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filters
  const [externalCode, setExternalCode] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const fetchWaybills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (externalCode) params.set('externalCode', externalCode);
      if (receiverName) params.set('receiverName', receiverName);
      if (dateRange) {
        params.set('startDate', dateRange[0]);
        params.set('endDate', dateRange[1]);
      }

      const response = await fetch(`/api/waybills?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWaybills(data.waybills);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch waybills:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, externalCode, receiverName, dateRange]);

  useEffect(() => {
    fetchWaybills();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    fetchWaybills();
  };

  const handleReset = () => {
    setExternalCode('');
    setReceiverName('');
    setDateRange(null);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/waybills/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'waybills_export.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Table columns
  const columns: ColumnsType<Waybill> = [
    {
      title: '#',
      width: 55,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    ...WAYBILL_FIELDS.map(f => ({
      title: f.label,
      dataIndex: f.key,
      key: f.key,
      ellipsis: true,
      sorter: true,
      width: f.key === 'skuName' ? 200 : f.key === 'skuCode' ? 140 : 130,
    })),
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 170,
      sorter: true,
      render: (val: string) => formatDate(val),
    },
  ];

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
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>运单管理</h1>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchWaybills}>刷新</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
          </Space>
        </div>

        {/* Filter */}
        <Card size="small" styles={{ body: { paddingBottom: 0 } }}>
          <Row gutter={16} style={{ paddingBottom: 16 }}>
            <Col>
              <Space>
                <span style={{ fontSize: 13, color: '#606266' }}>外部编码</span>
                <Input
                  value={externalCode}
                  onChange={e => setExternalCode(e.target.value)}
                  placeholder="请输入外部编码"
                  size="small"
                  style={{ width: 180 }}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <span style={{ fontSize: 13, color: '#606266' }}>收件人</span>
                <Input
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  placeholder="请输入收件人姓名"
                  size="small"
                  style={{ width: 180 }}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <span style={{ fontSize: 13, color: '#606266' }}>日期范围</span>
                <RangePicker
                  size="small"
                  style={{ width: 260 }}
                  onChange={(_, dateStrings) => {
                    if (dateStrings && dateStrings[0] && dateStrings[1]) {
                      setDateRange([dateStrings[0], dateStrings[1]]);
                    } else {
                      setDateRange(null);
                    }
                  }}
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
                <Button size="small" icon={<UndoOutlined />} onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Table<Waybill>
          columns={columns}
          dataSource={waybills}
          rowKey="id"
          loading={isLoading}
          size="small"
          bordered
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: '暂无数据' }}
        />
      </div>
    </ConfigProvider>
  );
}
