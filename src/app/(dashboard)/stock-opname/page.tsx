'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';

interface ProductOption {
  product_id: number;
  product_code: string;
  product_name: string;
  stock?: { stock_quantity: number };
}

interface OpnameEntry {
  product_id: number;
  counted_quantity: number;
  notes: string;
}

export default function StockOpnamePage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<'product_code' | 'product_name' | 'stock_quantity' | null>('product_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch edits: keyed by product_id
  const [opnameEdits, setOpnameEdits] = useState<Record<number, { counted_quantity: string; notes: string }>>({});
  const [globalNotes, setGlobalNotes] = useState('');

  const fetchProducts = useCallback(async (searchQuery: string, page: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        is_active: 'true',
        page: page.toString(),
        limit: rowsPerPage.toString(),
      });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/master/product?${params}`);
      const json = await res.json();
      if (res.ok) {
        setProducts(json.data || []);
        setTotal(json.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  // Fetch saat halaman pertama dibuka
  useEffect(() => {
    fetchProducts('', 1);
  }, [fetchProducts]);

  // Debounce search: fetch saat user berhenti mengetik
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(val, 1);
    }, 350);
  };

  // Fetch saat ganti halaman
  useEffect(() => {
    fetchProducts(search, currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Sorting dilakukan client-side atas data satu halaman yang sudah di-fetch
  const filteredProducts = useMemo(() => {
    if (!sortKey) return products;
    return [...products].sort((a, b) => {
      const aValue =
        sortKey === 'stock_quantity'
          ? a.stock?.stock_quantity ?? 0
          : (a as any)[sortKey] ?? '';
      const bValue =
        sortKey === 'stock_quantity'
          ? b.stock?.stock_quantity ?? 0
          : (b as any)[sortKey] ?? '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortOrder === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [products, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const paginatedProducts = filteredProducts;

  const sortIndicator = (key: 'product_code' | 'product_name' | 'stock_quantity') =>
    sortKey === key ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  const handleSort = (key: 'product_code' | 'product_name' | 'stock_quantity') => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortOrder('asc');
  };

  const handleEditQuantity = (productId: number, value: string) => {
    setOpnameEdits((prev) => {
      const existing = prev[productId] || { counted_quantity: '', notes: '' };
      // If emptied, remove from edits
      if (value === '' && !existing.notes) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...existing, counted_quantity: value } };
    });
  };

  const handleEditNotes = (productId: number, value: string) => {
    setOpnameEdits((prev) => {
      const existing = prev[productId] || { counted_quantity: '', notes: '' };
      if (value === '' && !existing.counted_quantity) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...existing, notes: value } };
    });
  };

  const handleRemoveEdit = (productId: number) => {
    setOpnameEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleClearAll = () => {
    setOpnameEdits({});
    setGlobalNotes('');
  };

  // Get pending edits with actual changes
  const pendingItems = useMemo(() => {
    const items: (OpnameEntry & { product_code: string; product_name: string; current_stock: number; diff: number })[] = [];
    for (const [pidStr, edit] of Object.entries(opnameEdits)) {
      const pid = Number(pidStr);
      const counted = Number(edit.counted_quantity);
      if (edit.counted_quantity === '' || Number.isNaN(counted)) continue;
      const product = products.find((p) => p.product_id === pid);
      if (!product) continue;
      const currentStock = product.stock?.stock_quantity ?? 0;
      items.push({
        product_id: pid,
        counted_quantity: counted,
        notes: edit.notes || globalNotes,
        product_code: product.product_code,
        product_name: product.product_name,
        current_stock: currentStock,
        diff: counted - currentStock,
      });
    }
    return items;
  }, [opnameEdits, products, globalNotes]);

  const handleSubmit = async () => {
    if (pendingItems.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Tidak ada perubahan', text: 'Masukkan jumlah revisi stok pada kolom "Revisi" di tabel produk.' });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Konfirmasi Stock Opname',
      html: `Anda akan memperbarui stok <b>${pendingItems.length} produk</b>. Lanjutkan?`,
      showCancelButton: true,
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal',
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pendingItems.map((item) => ({
            product_id: item.product_id,
            counted_quantity: item.counted_quantity,
            notes: item.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan stock opname');
      }

      await Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message || 'Stock opname berhasil disimpan' });
      setOpnameEdits({});
      setGlobalNotes('');
      fetchProducts(search, currentPage);
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Stock Opname</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Masukkan jumlah hasil hitung fisik pada kolom &quot;Revisi&quot;, lalu simpan semua perubahan sekaligus.
        </span>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Produk</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Total {total} produk{search ? ` (filter: "${search}")` : ''}
            </span>
          </div>
          <input
            className="form-input"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            style={{ width: '300px' }}
          />
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ width: '3.5rem' }}>No</th>
                <th onClick={() => handleSort('product_code')} style={{ cursor: 'pointer' }}>
                  Kode {sortIndicator('product_code')}
                </th>
                <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>
                  Nama Produk {sortIndicator('product_name')}
                </th>
                <th onClick={() => handleSort('stock_quantity')} style={{ cursor: 'pointer', width: '7rem', textAlign: 'center' }}>
                  Stok Sistem {sortIndicator('stock_quantity')}
                </th>
                <th style={{ width: '8rem', textAlign: 'center' }}>Revisi</th>
                <th style={{ width: '6rem', textAlign: 'center' }}>Selisih</th>
                <th style={{ width: '12rem' }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Tidak ada produk yang cocok
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, index) => {
                  const edit = opnameEdits[product.product_id];
                  const currentStock = product.stock?.stock_quantity ?? 0;
                  const countedVal = edit?.counted_quantity ?? '';
                  const counted = Number(countedVal);
                  const hasEdit = countedVal !== '' && !Number.isNaN(counted);
                  const diff = hasEdit ? counted - currentStock : null;

                  return (
                    <tr
                      key={product.product_id}
                      style={{
                        background: hasEdit ? 'rgba(99,102,241,0.06)' : undefined,
                      }}
                    >
                      <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                      <td style={{ fontWeight: 700 }}>{product.product_code}</td>
                      <td>{product.product_name}</td>
                      <td style={{ textAlign: 'center' }}>{currentStock}</td>
                      <td style={{ textAlign: 'center', padding: '0.35rem 0.5rem' }}>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          value={countedVal}
                          onChange={(e) => handleEditQuantity(product.product_id, e.target.value)}
                          placeholder="—"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            padding: '0.4rem',
                            fontSize: '0.9rem',
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {diff !== null ? (
                          <span style={{
                            fontWeight: 700,
                            color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : 'var(--text-muted)',
                          }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={edit?.notes ?? ''}
                          onChange={(e) => handleEditNotes(product.product_id, e.target.value)}
                          placeholder="Opsional"
                          style={{
                            width: '100%',
                            padding: '0.4rem',
                            fontSize: '0.85rem',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>
            Menampilkan {paginatedProducts.length} dari {filteredProducts.length} data
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
              Sebelumnya
            </button>
            <span style={{ alignSelf: 'center' }}>Halaman {currentPage} dari {totalPages}</span>
            <button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Summary & Submit Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
            Ringkasan Perubahan
            {pendingItems.length > 0 && (
              <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--primary)', color: '#fff', fontSize: '0.8rem' }}>
                {pendingItems.length} produk
              </span>
            )}
          </h3>
          {pendingItems.length > 0 && (
            <button className="btn btn-secondary" onClick={handleClearAll} style={{ fontSize: '0.85rem', color: '#dc2626', borderColor: '#dc2626' }}>
              Hapus Semua
            </button>
          )}
        </div>

        {pendingItems.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
            Belum ada perubahan. Masukkan jumlah revisi stok pada tabel di atas.
          </p>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none', marginBottom: '1rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '3rem' }}>No</th>
                    <th>Kode</th>
                    <th>Nama Produk</th>
                    <th style={{ textAlign: 'center' }}>Stok Sistem</th>
                    <th style={{ textAlign: 'center' }}>Revisi</th>
                    <th style={{ textAlign: 'center' }}>Selisih</th>
                    <th>Catatan</th>
                    <th style={{ width: '4rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, idx) => (
                    <tr key={item.product_id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.product_code}</td>
                      <td>{item.product_name}</td>
                      <td style={{ textAlign: 'center' }}>{item.current_stock}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.counted_quantity}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          color: item.diff > 0 ? '#16a34a' : item.diff < 0 ? '#dc2626' : 'var(--text-muted)',
                        }}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.notes || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleRemoveEdit(item.product_id)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#dc2626' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Catatan Global (opsional, untuk semua produk tanpa catatan individual)</label>
                <input
                  type="text"
                  className="form-input"
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  placeholder="Contoh: Stock opname bulanan Agustus 2026"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={handleSubmit}
                style={{ height: '38px', whiteSpace: 'nowrap' }}
              >
                {loading ? 'Menyimpan...' : `Simpan ${pendingItems.length} Perubahan`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
