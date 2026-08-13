"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { exportToCSV } from '@/lib/exportExcel';
import DataTableClient from '@/components/DataTableClient';

const PRINT_STYLE = `
@media print {
  aside, header, nav, .no-print { display: none !important; }
  body, main, .app-container, .main-content {
    margin: 0 !important; padding: 0 !important;
    background: #fff !important; color: #000 !important; width: 100% !important;
  }
  .card { border: none !important; box-shadow: none !important; padding: 0 !important; background: #fff !important; }
  .report-view { display: none !important; }
  .print-section { display: block !important; }
  .print-header { display: block !important; margin-bottom: 1.2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
  .print-header h1 { font-size: 1.4rem !important; margin: 0 !important; color: #000 !important; }
  .table { width: 100% !important; border-collapse: collapse !important; }
  .table th, .table td { border: 1px solid #000 !important; padding: 0.4rem 0.5rem !important; color: #000 !important; font-size: 0.8rem !important; }
  .table th { background-color: #f0f0f0 !important; font-weight: 700; }
  .table tfoot tr td { background-color: #e8e8e8 !important; font-weight: 700; }
}
.print-section { display: none; }
.print-header { display: none; }
`;

export default function ReturReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getField = (item: any, key: string) => {
    switch (key) {
      case 'sales_return_number': return item.sales_return_number || item.salesReturnNumber || '';
      case 'date': return item.date || item.return_datetime || '';
      case 'sales_number': return item.sales_number || item.salesNumber || '';
      case 'customer': return item.customer || item.customer_name || item.customer_name_snapshot || '';
      case 'operator': return item.operator || item.created_by_name_snapshot || '';
      case 'total_items': return Number(item.total_items || 0);
      case 'total_quantity': return Number(item.total_quantity || 0);
      case 'status': return item.status || item.return_status || '';
      case 'reason': return item.reason || item.return_reason || '';
      default: return item[key] || '';
    }
  };

  const dataForTable = data.map((item) => ({
    ...item,
    _sales_return_number: getField(item, 'sales_return_number'),
    _date: getField(item, 'date'),
    _sales_number: getField(item, 'sales_number'),
    _customer: getField(item, 'customer'),
    _total_items: getField(item, 'total_items'),
    _total_quantity: getField(item, 'total_quantity'),
    _operator: getField(item, 'operator'),
    _status: getField(item, 'status'),
    _reason: getField(item, 'reason'),
  }));

  const totalItems = data.reduce((s, i) => s + Number(getField(i, 'total_items')), 0);
  const totalQuantity = data.reduce((s, i) => s + Number(getField(i, 'total_quantity')), 0);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      const res = await fetch(`/api/laporan/retur${params.toString() ? `?${params}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setData(json);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [start, end]);

  useEffect(() => { fetchReport(); }, []);

  const handleExportCSV = () => {
    const headers = ['No. Retur', 'Tanggal & Waktu', 'No. Penjualan', 'Customer', 'Total Item', 'Jumlah Qty', 'Operator', 'Status', 'Alasan Retur'];
    const rows = data.map(r => [
      getField(r, 'sales_return_number'), getField(r, 'date'), getField(r, 'sales_number'),
      getField(r, 'customer'), getField(r, 'total_items'), getField(r, 'total_quantity'),
      getField(r, 'operator'), getField(r, 'status'), getField(r, 'reason'),
    ]);
    exportToCSV(`Laporan_Retur_${start || 'semua'}_sd_${end || 'semua'}`, headers, rows);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <style jsx global>{PRINT_STYLE}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Laporan Retur Penjualan</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Laporan &gt; Laporan Retur</span>
          </div>
        </div>

        {/* Filter */}
        <div className="card no-print" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Dari Tanggal</label>
            <input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Sampai Tanggal</label>
            <input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading} style={{ height: '38px' }}>
            {loading ? 'Memuat...' : '🔍 Tampilkan'}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ color: '#16a34a', borderColor: '#16a34a' }}>
              📊 Export CSV
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Cetak / PDF
            </button>
          </div>
        </div>

        {/* DataTable view (screen only) */}
        <div className="card report-view" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Retur Penjualan</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {loading ? 'Memuat...' : `${data.length} retur`}
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat data...</div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <DataTableClient
                data={dataForTable}
                columns={[
                  { title: 'No. Retur', data: '_sales_return_number' },
                  { title: 'Tanggal & Waktu', data: '_date' },
                  { title: 'No. Penjualan', data: '_sales_number' },
                  { title: 'Customer', data: '_customer' },
                  { title: 'Item Retur', data: '_total_items', className: 'text-right' },
                  { title: 'Qty Retur', data: '_total_quantity', className: 'text-right' },
                  { title: 'Operator', data: '_operator' },
                  { title: 'Status', data: '_status', className: 'text-center' },
                  { title: 'Alasan Retur', data: '_reason' },
                ]}
                slots={{
                  0: (_c, r) => <span style={{ fontWeight: 600 }}>{r._sales_return_number || '-'}</span>,
                  4: (_c, r) => Number(r._total_items || 0).toLocaleString('id-ID'),
                  5: (_c, r) => Number(r._total_quantity || 0).toLocaleString('id-ID'),
                  7: (_c, r) => (
                    <span className="badge" style={{ background: r._status === 'COMPLETED' ? 'rgba(34,197,94,0.14)' : 'rgba(107,114,128,0.16)', color: r._status === 'COMPLETED' ? '#16a34a' : '#374151' }}>
                      {r._status || '-'}
                    </span>
                  ),
                }}
                className="display table"
              >
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL (semua data):</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>{totalItems.toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right', padding: '1rem' }}>{totalQuantity.toLocaleString('id-ID')}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </DataTableClient>
            </div>
          )}
        </div>

        {/* Print-only section */}
        <div className="print-section">
          <div className="print-header">
            <h1>MITRA MOTOR</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>LAPORAN RETUR PENJUALAN</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
              Periode: {start || 'Semua'} s/d {end || 'Semua'} &nbsp;|&nbsp; Dicetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>No. Retur</th>
                <th>Tanggal &amp; Waktu</th>
                <th>No. Penjualan</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Operator</th>
                <th>Status</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{getField(row, 'sales_return_number') || '-'}</td>
                  <td>{getField(row, 'date') || '-'}</td>
                  <td>{getField(row, 'sales_number') || '-'}</td>
                  <td>{getField(row, 'customer') || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(getField(row, 'total_items')).toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right' }}>{Number(getField(row, 'total_quantity')).toLocaleString('id-ID')}</td>
                  <td>{getField(row, 'operator') || '-'}</td>
                  <td>{getField(row, 'status') || '-'}</td>
                  <td>{getField(row, 'reason') || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL RETUR: {data.length} transaksi</td>
                <td style={{ textAlign: 'right' }}>{totalItems.toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'right' }}>{totalQuantity.toLocaleString('id-ID')}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </>
  );
}
