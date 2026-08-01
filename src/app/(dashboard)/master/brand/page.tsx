'use client';

import React, { useState, useEffect } from 'react';

interface Brand {
  brand_id: number;
  brand_code: string;
  brand_name: string;
  old_code?: string;
  notes?: string;
  is_active: boolean;
}

export default function BrandPage() {
  const [data, setData] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [brandCode, setBrandCode] = useState('');
  const [brandName, setBrandName] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/brand?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
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

  useEffect(() => {
    fetchBrands();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditId(null);
    setBrandCode('');
    setBrandName('');
    setOldCode('');
    setNotes('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditId(brand.brand_id);
    setBrandCode(brand.brand_code || '');
    setBrandName(brand.brand_name || '');
    setOldCode(brand.old_code || '');
    setNotes(brand.notes || '');
    setIsActive(brand.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const url = editId ? `/api/master/brand/${editId}` : '/api/master/brand';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_code: brandCode,
          brand_name: brandName,
          old_code: oldCode,
          notes,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }
      setModalOpen(false);
      fetchBrands();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSoftDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan merek ini?')) return;
    try {
      const res = await fetch(`/api/master/brand/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBrands();
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal menonaktifkan');
      }
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '2rem' }}>Master Merek</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data merek/brand sparepart (misal: HONDA, YAMAHA, ASPIRA)
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Merek
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan kode atau nama merek..."
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
                <th>Kode Merek</th>
                <th>Nama Merek</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada data merek
                  </td>
                </tr>
              ) : (
                data.map((b) => (
                  <tr key={b.brand_id}>
                    <td style={{ fontWeight: 700 }}>{b.brand_code}</td>
                    <td>{b.brand_name}</td>
                    <td>
                      <span className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {b.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleSoftDelete(b.brand_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!b.is_active}
                      >
                        🗑️
                      </button>
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

      {/* Create / Edit Modal (Matching Screenshot 1) */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Tambah / Edit Merek
              </h3>
              <button onClick={() => setModalOpen(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formError && (
                  <div className="alert alert-danger">
                    {formError}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Kode Merek <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="MRK001"
                    value={brandCode}
                    onChange={(e) => setBrandCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Merek <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="HONDA"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kode Lama</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="001"
                    value={oldCode}
                    onChange={(e) => setOldCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Merek kendaraan / sparepart"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Status Radio Buttons */}
                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="brand_status"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                      />
                      Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="brand_status"
                        checked={isActive === false}
                        onChange={() => setIsActive(false)}
                      />
                      Tidak Aktif
                    </label>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
