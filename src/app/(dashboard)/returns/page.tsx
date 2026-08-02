"use client";

import React, { useState } from 'react';
import Swal from 'sweetalert2';

export default function SalesReturnPage() {
  // Search State
  const [salesNumberQuery, setSalesNumberQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundSales, setFoundSales] = useState<any>(null);
  
  // Return Form State
  const [returnReason, setReturnReason] = useState('Produk tidak sesuai');
  const [notes, setNotes] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSearch = async () => {
    if (!salesNumberQuery) return;
    setIsSearching(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFoundSales(null);
    setReturnItems([]);

    try {
      const res = await fetch(`/api/returns/check-sales/${encodeURIComponent(salesNumberQuery)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Transaksi tidak ditemukan atau tidak dapat diretur');
      }

      setFoundSales(data);
      
      // Initialize return items based on details
      if (data && data.details) {
        const items = data.details.map((d: any) => {
          const prevRet = d.previous_return_quantity || 0;
          const maxRet = d.returnable_quantity ?? (d.sold_quantity - prevRet);
          
          return {
            sales_detail_id: d.sales_detail_id,
            product_id: d.product_id,
            product_code: d.product_code_snapshot,
            name: d.product_name_snapshot,
            bought: d.sold_quantity,
            returned: prevRet,
            maxReturn: maxRet,
            currentStock: d.current_stock ?? 0,
            returnQty: '',
            reason: ''
          };
        });
        setReturnItems(items);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReturnQtyChange = (index: number, val: string) => {
    const newItems = [...returnItems];
    newItems[index].returnQty = val;
    setReturnItems(newItems);
  };

  const handleItemReasonChange = (index: number, val: string) => {
    const newItems = [...returnItems];
    newItems[index].reason = val;
    setReturnItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...returnItems];
    newItems[index].returnQty = ''; // just reset it
    setReturnItems(newItems);
  };

  // Calculations
  const activeReturnItems = returnItems.filter(item => {
    const qty = parseInt(item.returnQty) || 0;
    return qty > 0;
  });
  
  const totalTypes = activeReturnItems.length;
  const totalReturnQty = activeReturnItems.reduce((acc, item) => acc + (parseInt(item.returnQty) || 0), 0);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!foundSales) {
      setErrorMsg('Cari dan pilih transaksi penjualan terlebih dahulu.');
      return;
    }

    if (activeReturnItems.length === 0) {
      setErrorMsg('Tentukan jumlah retur untuk minimal 1 produk.');
      return;
    }

    const confirmSubmit = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menyimpan retur ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal',
    });

    if (!confirmSubmit.isConfirmed) return;

    // Validate max bounds
    for (const item of activeReturnItems) {
      const q = parseInt(item.returnQty);
      if (q > item.maxReturn) {
        setErrorMsg(`Jumlah retur produk ${item.name} melebihi maksimal yang diizinkan (${item.maxReturn}).`);
        return;
      }
    }

    setIsLoading(true);

    const payload = {
      sales_id: foundSales.sales_id,
      return_reason: returnReason,
      notes: notes,
      details: activeReturnItems.map(item => ({
        sales_detail_id: item.sales_detail_id,
        product_id: item.product_id,
        return_quantity: parseInt(item.returnQty),
        return_reason: item.reason || returnReason
      }))
    };

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses retur penjualan');
      }

      setSuccessMsg(`Retur berhasil disimpan dengan No: ${data.sales_return_number}`);
      // Reset form
      setFoundSales(null);
      setSalesNumberQuery('');
      setReturnItems([]);
      setNotes('');
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Penjualan / Retur Penjualan / <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tambah Retur</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>🧾</div>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', fontWeight: 700 }}>Retur Penjualan</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Mencatat barang yang dikembalikan customer berdasarkan transaksi penjualan</p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)' }}>
          {successMsg}
        </div>
      )}

      {/* 1. Pilih Transaksi Penjualan */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>1. Pilih Transaksi Penjualan</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="form-label" style={{ whiteSpace: 'nowrap', margin: 0 }}>Nomor Transaksi Penjualan</label>
            <input 
              type="text" 
              className="form-input" 
              value={salesNumberQuery} 
              onChange={(e) => setSalesNumberQuery(e.target.value)} 
              placeholder="Contoh: PJ-20260730-000150"
              style={{ flexGrow: 1 }} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }} onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Mencari...' : '🔍 Cari'}
            </button>
          </div>
          
          {foundSales && (
            <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center', color: 'var(--success)' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span>✓</span> Transaksi ditemukan
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{foundSales.sales_number} - {new Date(foundSales.sales_datetime).toLocaleString('id-ID')}</div>
            </div>
          )}
        </div>

        {foundSales && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Nomor Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.sales_number}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Tanggal Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {new Date(foundSales.sales_datetime).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Jenis Penjualan</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.sales_type}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Customer</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.customer_name_snapshot || 'Pelanggan Umum'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Kasir</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.cashier_name_snapshot}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Subtotal</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.subtotal).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Diskon</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.discount_amount).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Total</div>
              <div style={{ fontWeight: 500 }}>: Rp {parseFloat(foundSales.total_amount).toLocaleString('id-ID')}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Status Pembayaran</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.payment_status}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Status Transaksi</div>
              <div style={{ fontWeight: 500 }}>: {foundSales.transaction_status}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Informasi Retur */}
      {foundSales && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>2. Informasi Retur</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Nomor Retur</label>
                <input type="text" className="form-input" value="Dibuat Otomatis" readOnly style={{ background: 'var(--bg-tertiary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Tanggal Retur</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input" value={new Date().toLocaleString('id-ID')} readOnly style={{ width: '100%', background: 'var(--bg-tertiary)' }} />
                  <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>📅</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Alasan Retur (Umum) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-select form-input" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                  <option value="Produk tidak sesuai">Produk tidak sesuai</option>
                  <option value="Produk cacat/rusak">Produk cacat/rusak</option>
                  <option value="Salah input">Salah input</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'flex-start' }}>
                <label className="form-label" style={{ margin: 0, marginTop: '0.75rem' }}>Catatan</label>
                <div style={{ width: '100%' }}>
                  <textarea className="form-input" placeholder="Catatan tambahan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detail Produk yang Diretur */}
      {foundSales && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>3. Detail Produk yang Diretur</h3>
          </div>

          <div className="table-container" style={{ border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0 }}>
            <table className="table" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '1rem', width: '50px' }}>No</th>
                  <th style={{ padding: '1rem' }}>Produk</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Jumlah Dibeli<br/>(PCS)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Sudah Diretur<br/>(PCS)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Maksimal Retur<br/>(PCS)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Jumlah Retur (PCS) <span style={{ color: 'var(--danger)' }}>*</span></th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Stok Setelah<br/>Retur (PCS)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Alasan (Per Produk)</th>
                  <th style={{ padding: '1rem', textAlign: 'center', width: '60px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((item, index) => {
                  const qtyVal = parseInt(item.returnQty) || 0;
                  // For safety, assume currentStock wasn't fully populated in check-sales and just show +qty
                  const afterStockAdd = qtyVal > 0 ? `+${qtyVal}` : '-';
                  
                  return (
                    <tr key={item.sales_detail_id}>
                      <td style={{ padding: '1rem' }}>{index + 1}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{item.product_code} - {item.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{item.bought}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{item.returned}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{item.maxReturn}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={item.returnQty} 
                          onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                          max={item.maxReturn}
                          min="0"
                          style={{ width: '80px', padding: '0.5rem', textAlign: 'center' }} 
                        />
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{afterStockAdd}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <select 
                          className="form-select form-input" 
                          style={{ padding: '0.5rem' }}
                          value={item.reason}
                          onChange={(e) => handleItemReasonChange(index, e.target.value)}
                        >
                          <option value="">Ikut Alasan Umum</option>
                          <option value="Produk tidak sesuai">Produk tidak sesuai</option>
                          <option value="Produk cacat">Produk cacat</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleRemoveItem(index)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '1.5rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '150px auto', gap: '0.75rem', minWidth: '350px' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Jenis Produk</div>
              <div style={{ fontWeight: 700 }}>: {totalTypes}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Quantity Retur</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>: {totalReturnQty} PCS</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {foundSales && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.75rem 2.5rem' }} onClick={() => { setFoundSales(null); setSalesNumberQuery(''); setReturnItems([]); }}>
            Batal
          </button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2.5rem' }} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : '💾 Simpan Retur'}
          </button>
        </div>
      )}

    </div>
  );
}
