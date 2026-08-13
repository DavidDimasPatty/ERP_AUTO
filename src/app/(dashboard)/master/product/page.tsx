'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import AsyncSearchableSelect, { AsyncSelectOption } from '@/components/AsyncSearchableSelect';
import DataTableClient from '@/components/DataTableClient';

interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  cost_price: number;
  minimum_stock: number;
  unit_id?: number;
  brand_id?: number;
  product_description?: string;
  stock?: { stock_quantity: number };
  prices?: { price_level_id: number; price_amount: number }[];
  is_active: boolean;
}

const PAGE_SIZE = 50;

export default function ProductPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [unitId, setUnitId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [minimumStock, setMinimumStock] = useState('');
  const [prices, setPrices] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '' });
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Debounce search
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
      const params = new URLSearchParams({ search, page: String(pg), limit: String(PAGE_SIZE) });
      const res = await fetch(`/api/master/product?${params}`);
      const json = res.ok ? await res.json() : null;
      if (json) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotal(json.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(debouncedSearch, page);
  }, [fetchProducts, debouncedSearch, page]);

  // ── Async selects ─────────────────────────────────────────────

  const fetchUnitOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams({ is_active: 'true', limit: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/master/unit?${params}`);
    const json = await res.json();
    return (json.data || []).map((u: any) => ({ value: u.unit_id.toString(), label: u.unit_name }));
  }, []);

  const resolveUnit = useCallback(async (value: string): Promise<AsyncSelectOption | null> => {
    const res = await fetch(`/api/master/unit?limit=50`);
    const json = await res.json();
    const found = (json.data || []).find((u: any) => u.unit_id.toString() === value);
    return found ? { value: found.unit_id.toString(), label: found.unit_name } : null;
  }, []);

  const fetchBrandOptions = useCallback(async (search: string): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams({ is_active: 'true', limit: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/master/brand?${params}`);
    const json = await res.json();
    return (json.data || []).map((b: any) => ({ value: b.brand_id.toString(), label: b.brand_name }));
  }, []);

  const resolveBrand = useCallback(async (value: string): Promise<AsyncSelectOption | null> => {
    const res = await fetch(`/api/master/brand?limit=50`);
    const json = await res.json();
    const found = (json.data || []).find((b: any) => b.brand_id.toString() === value);
    return found ? { value: found.brand_id.toString(), label: found.brand_name } : null;
  }, []);

  // ── Modal handlers ────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditId(null);
    setProductCode('');
    setProductName('');
    setUnitId('');
    setBrandId('');
    setProductDescription('');
    setCostPrice('');
    setMinimumStock('');
    setPrices({ 1: '', 2: '', 3: '', 4: '', 5: '' });
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditId(prod.product_id);
    setProductCode(prod.product_code || '');
    setProductName(prod.product_name || '');
    setUnitId(prod.unit_id?.toString() ?? '');
    setBrandId(prod.brand_id?.toString() ?? '');
    setProductDescription(prod.product_description || '');
    setCostPrice(prod.cost_price?.toString() ?? '0');
    setMinimumStock(prod.minimum_stock?.toString() ?? '0');
    const priceMap: { [key in 1 | 2 | 3 | 4 | 5]: string } = { 1: '0', 2: '0', 3: '0', 4: '0', 5: '0' };
    prod.prices?.forEach(p => { priceMap[p.price_level_id as 1 | 2 | 3 | 4 | 5] = p.price_amount.toString(); });
    setPrices(priceMap);
    setIsActive(prod.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: editId ? 'Apakah Anda yakin ingin memperbarui data produk ini?' : 'Apakah Anda yakin ingin menyimpan produk baru ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    setFormLoading(true);
    const url = editId ? `/api/master/product/${editId}` : '/api/master/product';
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_code: productCode,
          product_name: productName,
          unit_id: unitId ? parseInt(unitId, 10) : null,
          brand_id: brandId ? parseInt(brandId, 10) : null,
          product_description: productDescription,
          cost_price: parseFloat(costPrice),
          minimum_stock: parseInt(minimumStock, 10),
          prices,
          is_active: isActive,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || 'Terjadi kesalahan');
      setModalOpen(false);
      fetchProducts(debouncedSearch, page);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleHardDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus produk ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/master/product?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts(debouncedSearch, page);
      } else {
        const err = await res.json();
        await Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal menghapus' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus' });
    }
  };

  const handleSoftDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin mengubah status produk ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/master/product/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts(debouncedSearch, page);
      } else {
        const err = await res.json();
        await Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal mengubah status' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengubah status' });
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '2rem' }}>Master Produk</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data produk &amp; sparepart motor
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Produk
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '1rem', marginTop: '1rem', width: "50%" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Cari kode atau nama produk..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: "75%" }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {loading ? 'Memuat...' : `${total.toLocaleString('id-ID')} produk`}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '1rem' }}>
        <div className="table-container" style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat data...</div>
          ) : (
            <DataTableClient
              data={data}
              columns={[
                { title: 'Kode Produk', data: 'product_code' },
                { title: 'Nama Produk', data: 'product_name' },
                { title: 'Nama Brand', data: 'brand.brand_name' },
                { title: 'Harga Pokok', data: 'cost_price' },
                { title: 'Stok', data: 'stock' },
                { title: 'Status', data: null, orderable: false, searchable: false },
                { title: 'Aksi', data: null, orderable: false, searchable: false, className: 'text-center' },
              ]}
              slots={{
                3: (_c: any, rowData: Product) => <span>Rp {Number(rowData.cost_price || 0).toLocaleString('id-ID')}</span>,
                4: (_c: any, rowData: Product) => <span>{rowData.stock?.stock_quantity ?? '-'}</span>,
                5: (_c: any, rowData: Product) => (
                  <span className={`badge ${rowData.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {rowData.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                ),
                6: (_c: any, rowData: Product) => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(rowData)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleSoftDelete(rowData.product_id)}
                      className={rowData.is_active ? 'btn btn-primary' : 'btn btn-success'}
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      {rowData.is_active ? 'DEACTIVE' : 'ACTIVE'}
                    </button>
                  </div>
                ),
              }}
              className="display table"
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)' }}>
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {editId ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
                {formError && <div className="alert alert-danger">{formError}</div>}

                {/* {editId && (
                  <div className="form-group">
                    <label className="form-label">Kode Produk <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      required={!!editId}
                      readOnly={!!editId}
                    />
                  </div>
                )} */}


                <div className="form-group">
                  <label className="form-label">Kode Produk <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Nama Produk <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: Oli Mesin 1L"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Maksimal 180 karakter</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Satuan <span style={{ color: 'red' }}>*</span></label>
                      <AsyncSearchableSelect
                        value={unitId}
                        fetchOptions={fetchUnitOptions}
                        resolveSelected={resolveUnit}
                        onChange={(value) => setUnitId(value)}
                        placeholder="Ketik nama satuan..."
                        className="form-select form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Merek</label>
                      <AsyncSearchableSelect
                        value={brandId}
                        fetchOptions={fetchBrandOptions}
                        resolveSelected={resolveBrand}
                        onChange={(value) => setBrandId(value)}
                        placeholder="Ketik nama merek..."
                        className="form-select form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Deskripsi</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Contoh: Oli mesin untuk motor"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Maksimal 255 karakter</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Harga Pokok <span style={{ color: 'red' }}>*</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>Rp</span>
                        <input
                          type="text"
                          className="form-input"
                          inputMode="numeric"
                          value={costPrice === '' ? '' : Number(costPrice).toLocaleString('id-ID')}
                          onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setCostPrice(raw); }}
                          style={{ border: 'none', background: 'transparent' }}
                          placeholder='0'
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stok Minimum <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={minimumStock}
                        onChange={(e) => setMinimumStock(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Harga Jual (5 Level)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        {[1, 2, 3, 4, 5].map(level => (
                          <div key={level} style={{ display: 'grid', gridTemplateColumns: '80px 30px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              Harga {level} {level === 1 && <span style={{ color: 'red', marginLeft: '2px' }}>*</span>}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rp</span>
                            <input
                              type="text"
                              className="form-input"
                              inputMode="numeric"
                              value={prices[level as keyof typeof prices] === '' ? '' : Number(prices[level as keyof typeof prices]).toLocaleString('id-ID')}
                              onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setPrices({ ...prices, [level]: raw }); }}
                              style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Aktif</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" disabled={formLoading} style={{ padding: '0.5rem 1.25rem' }}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ padding: '0.5rem 1.25rem' }}>
                      {formLoading ? 'Menyimpan...' : editId ? 'Update' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
