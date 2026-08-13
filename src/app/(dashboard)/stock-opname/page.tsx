'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';

interface ProductRow {
  product_id: number;
  product_code: string;
  product_name: string;
  brand_name?: string | null;
  stock_quantity: number;
}

interface OpnameEdit {
  counted_quantity: string;
  notes: string;
  product_code: string;
  product_name: string;
  current_stock: number;
}

const PAGE_SIZE = 50;

export default function StockOpnamePage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Batch edits: keyed by product_id
  const [opnameEdits, setOpnameEdits] = useState<Record<number, OpnameEdit>>({});
  const [globalNotes, setGlobalNotes] = useState('');

  // Debounce search input — 400ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(val);
    }, 400);
  };

  const fetchProducts = useCallback(async (search: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(pg),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/stock-opname/products?${params}`);
      const json = await res.json();
      if (res.ok) {
        setProducts(json.data || []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotal(json.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(debouncedSearch, page);
  }, [fetchProducts, debouncedSearch, page]);

  // ── Edit handlers ──────────────────────────────────────────────

  const handleEditQuantity = (row: ProductRow, value: string) => {
    const { product_id, product_code, product_name, stock_quantity } = row;
    setOpnameEdits((prev) => {
      const existing = prev[product_id];
      if (value === '' && (!existing || !existing.notes)) {
        const next = { ...prev };
        delete next[product_id];
        return next;
      }
      return {
        ...prev,
        [product_id]: {
          counted_quantity: value,
          notes: existing?.notes ?? '',
          product_code: existing?.product_code ?? product_code,
          product_name: existing?.product_name ?? product_name,
          current_stock: existing?.current_stock ?? stock_quantity,
        },
      };
    });
  };

  const handleEditNotes = (row: ProductRow, value: string) => {
    const { product_id, product_code, product_name, stock_quantity } = row;
    setOpnameEdits((prev) => {
      const existing = prev[product_id];
      if (value === '' && (!existing || !existing.counted_quantity)) {
        const next = { ...prev };
        delete next[product_id];
        return next;
      }
      return {
        ...prev,
        [product_id]: {
          counted_quantity: existing?.counted_quantity ?? '',
          notes: value,
          product_code: existing?.product_code ?? product_code,
          product_name: existing?.product_name ?? product_name,
          current_stock: existing?.current_stock ?? stock_quantity,
        },
      };
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

  // ── Pending items ──────────────────────────────────────────────

  const pendingItems = useMemo(() => {
    const items: {
      product_id: number;
      counted_quantity: number;
      notes: string;
      product_code: string;
      product_name: string;
      current_stock: number;
      diff: number;
    }[] = [];
    for (const [pidStr, edit] of Object.entries(opnameEdits)) {
      const pid = Number(pidStr);
      const counted = Number(edit.counted_quantity);
      if (edit.counted_quantity === '' || Number.isNaN(counted)) continue;
      items.push({
        product_id: pid,
        counted_quantity: counted,
        notes: edit.notes || globalNotes,
        product_code: edit.product_code,
        product_name: edit.product_name,
        current_stock: edit.current_stock,
        diff: counted - edit.current_stock,
      });
    }
    return items;
  }, [opnameEdits, globalNotes]);

  // ── Submit ─────────────────────────────────────────────────────

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
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan stock opname');

      await Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message || 'Stock opname berhasil disimpan' });
      setOpnameEdits({});
      setGlobalNotes('');
      fetchProducts(debouncedSearch, page);
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Stock Opname</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Masukkan jumlah hasil hitung fisik pada kolom &quot;Revisi&quot;, lalu simpan semua perubahan sekaligus.
        </span>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ padding: '1rem' }}>

          {/* Toolbar: search + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari kode, nama produk, atau brand..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ width: "50%" }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {loading ? 'Memuat...' : `${total.toLocaleString('id-ID')} produk ditemukan`}
            </span>
            {Object.keys(opnameEdits).length > 0 && (
              <span
                className="badge"
                style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.78rem', marginLeft: 'auto' }}
              >
                {Object.keys(opnameEdits).length} produk diubah
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table display" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Kode Produk</th>
                  <th>Nama Produk</th>
                  <th>Brand</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Stok Sistem</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Revisi</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Selisih</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  products.map((row) => {
                    const edit = opnameEdits[row.product_id];
                    // Use current_stock from edit (captured at edit time) or live stock
                    const currentStock = edit?.current_stock ?? row.stock_quantity;
                    const countedVal = edit?.counted_quantity ?? '';
                    const counted = Number(countedVal);
                    const hasEdit = countedVal !== '' && !Number.isNaN(counted);
                    const diff = hasEdit ? counted - currentStock : null;

                    return (
                      <tr
                        key={row.product_id}
                        style={hasEdit ? { background: 'rgba(var(--primary-rgb, 99,102,241), 0.06)' } : undefined}
                      >
                        <td style={{ fontWeight: hasEdit ? 700 : 400 }}>{row.product_code}</td>
                        <td>{row.product_name}</td>
                        <td>{row.brand_name || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{currentStock.toLocaleString('id-ID')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            className="form-input"
                            min="0"
                            value={countedVal}
                            onChange={(e) => handleEditQuantity(row, e.target.value)}
                            placeholder="—"
                            style={{ width: '100%', textAlign: 'center', padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
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
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={edit?.notes ?? ''}
                            onChange={(e) => handleEditNotes(row, e.target.value)}
                            placeholder="Opsional"
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Halaman {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}
              >
                ‹ Prev
              </button>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.82rem' }}
              >
                Next ›
              </button>
            </div>
          )}
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
                      <td style={{ textAlign: 'center' }}>{item.current_stock.toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.counted_quantity.toLocaleString('id-ID')}</td>
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
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  Catatan Global (opsional, untuk semua produk tanpa catatan individual)
                </label>
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
