'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

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

export default function ProductPage() {
  const [data, setData] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Units & Brands for Select dropdowns
  const [units, setUnits] = useState<{ unit_id: number; unit_name: string }[]>([]);
  const [brands, setBrands] = useState<{ brand_id: number; brand_name: string }[]>([]);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [unitId, setUnitId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');
  const [prices, setPrices] = useState({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0' });

  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/product?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const json = res.ok ? await res.json() : null;
      if (json) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsAndBrands = async () => {
    try {
      const resU = await fetch('/api/master/unit?limit=100');
      if (resU.ok) {
        const jU = await resU.json();
        setUnits(jU.data || []);
      }
      const resB = await fetch('/api/master/brand?limit=100');
      if (resB.ok) {
        const jB = await resB.json();
        setBrands(jB.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  useEffect(() => {
    fetchUnitsAndBrands();
  }, []);

  const handleOpenCreate = () => {
    setEditId(null);
    setProductCode('');
    setProductName('');
    setUnitId('');
    setBrandId('');
    setProductDescription('');
    setCostPrice('0');
    setMinimumStock('0');
    setPrices({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0' });
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
      text: editId
        ? 'Apakah Anda yakin ingin memperbarui data produk ini?'
        : 'Apakah Anda yakin ingin menyimpan produk baru ini?',
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
          prices: prices,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }
      setModalOpen(false);
      fetchProducts();
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
        fetchProducts();
      } else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Gagal menghapus',
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal menghapus',
      });
    }
  };

  const handleSoftDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menonaktifkan produk ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/product/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
      } else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Gagal menonaktifkan',
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal menghapus',
      });
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '2rem' }}>Master Produk</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data produk & sparepart motor
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Produk
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan kode atau nama produk..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kode Produk</th>
                <th>Nama Produk</th>
                <th>Harga Pokok</th>
                <th>Stok</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada data produk
                  </td>
                </tr>
              ) : (
                data.map((u) => (
                  <tr key={u.product_id}>
                    <td style={{ fontWeight: 700 }}>{u.product_code}</td>
                    <td>{u.product_name}</td>
                    <td>Rp {Number(u.cost_price || 0).toLocaleString('id-ID')}</td>
                    <td>{u.stock?.stock_quantity ?? '-'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        ✏️
                      </button>

                      {u.is_active && (
                        <button
                          onClick={() => handleSoftDelete(u.product_id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          DEACTIVE
                        </button>
                      )}

                      {!u.is_active && (
                        <button
                          onClick={() => handleSoftDelete(u.product_id)}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ACTIVE
                        </button>
                      )}

                      <button
                        onClick={() => handleHardDelete(u.product_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        🗑️
                      </button>
                      {/* <button
                        onClick={() => handleSoftDelete(u.product_id)}
                        className="btn btn-warning"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!u.is_active}
                      >
                        ❌
                      </button> */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Halaman {page} dari {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal (Matching Screenshot 4) */}
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
                {formError && (
                  <div className="alert alert-danger">
                    {formError}
                  </div>
                )}

                {/* 2 Column Main Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {editId && (
                      <div className="form-group">
                        <label className="form-label">Kode Produk <span style={{ color: 'red' }}>*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Isi kosong untuk generate otomatis"
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value)}
                          required={!!editId}
                          readOnly={!!editId}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Maksimal 30 karakter</span>
                      </div>
                    )}
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
                      <select
                        className="form-select form-input"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        required
                      >
                        <option value="">Pilih Satuan</option>
                        {units.map(u => (
                          <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Merek</label>
                      <select
                        className="form-select form-input"
                        value={brandId}
                        onChange={(e) => setBrandId(e.target.value)}
                      >
                        <option value="">Pilih Merek (Opsional)</option>
                        {brands.map(b => (
                          <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                        ))}
                      </select>
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
                          value={Number(costPrice || 0).toLocaleString('id-ID')}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\./g, '');
                            setCostPrice(value);
                          }}
                          style={{ border: 'none', background: 'transparent' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stok Minimum <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0,000"
                        value={minimumStock}
                        onChange={(e) => setMinimumStock(e.target.value)}
                      />
                    </div>

                    {/* Harga Jual (5 Level) Panel */}
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Harga Jual (5 Level)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        {[1, 2, 3, 4, 5].map(level => (
                          <div key={level} style={{ display: 'grid', gridTemplateColumns: '80px 30px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Harga {level}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rp</span>
                            <input
                              type="text"
                              className="form-input"
                              value={Number(prices[level as keyof typeof prices] || 0).toLocaleString('id-ID')}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\./g, '');
                                setPrices({ ...prices, [level]: value });
                              }}
                              style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}

                            // type="number"
                            // className="form-input"
                            // placeholder="0,000"
                            // value={prices[level as keyof typeof prices]}
                            // onChange={(e) => setPrices({ ...prices, [level]: e.target.value })}
                            // style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Checkbox Aktif & Buttons */}
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
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn btn-secondary"
                      disabled={formLoading}
                      style={{ padding: '0.5rem 1.25rem' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={formLoading}
                      style={{ padding: '0.5rem 1.25rem' }}
                    >
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
