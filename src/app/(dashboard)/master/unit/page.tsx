'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface Unit {
  unit_id: number;
  unit_code: string;
  unit_name: string;
  is_active: boolean;
}

export default function UnitPage() {
  const [data, setData] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/unit?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const json = res.ok ? await res.json() : null;
      if (json) {
        setData(json.data);
        setTotalPages(json.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditId(null);
    setUnitCode('');
    setUnitName('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditId(unit.unit_id);
    setUnitCode(unit.unit_code);
    setUnitName(unit.unit_name);
    setIsActive(unit.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: editId
        ? 'Apakah Anda yakin ingin memperbarui data satuan ini?'
        : 'Apakah Anda yakin ingin menyimpan satuan baru ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setFormLoading(true);
    const url = editId ? `/api/master/unit/${editId}` : '/api/master/unit';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: unitCode,
          unit_name: unitName,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }
      setModalOpen(false);
      fetchUnits();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };


  const handleHardDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus unit ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    })

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/unit?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUnits();
      }
      else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: err.message || 'Gagal menghapus',
        });
      }
    }
    catch (error) {
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
      text: 'Apakah Anda yakin ingin menonaktifkan satuan ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/unit/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUnits();
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
          <h1 style={{ fontSize: '2rem' }}>Master Satuan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data satuan barang (misal: PCS, DUS, LUSIN)
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah Satuan
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan kode atau nama satuan..."
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
                <th>Kode Satuan</th>
                <th>Nama Satuan</th>
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
                    Tidak ada data satuan
                  </td>
                </tr>
              ) : (
                data.map((u) => (
                  <tr key={u.unit_id}>
                    <td style={{ fontWeight: 700 }}>{u.unit_code}</td>
                    <td>{u.unit_name}</td>
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
                          onClick={() => handleSoftDelete(u.unit_id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          DEACTIVE
                        </button>
                      )}

                      {!u.is_active && (
                        <button
                          onClick={() => handleSoftDelete(u.unit_id)}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ACTIVE
                        </button>
                      )}

                      {/* <button
                        onClick={() => handleHardDelete(u.unit_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!u.is_active}
                      >
                        🗑️
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                {editId ? 'Tambah / Edit Satuan' : 'Tambah / Edit Satuan'}
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

                {editId && (
                  <div className="form-group">
                    <label className="form-label">Kode Satuan <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Isi kosong untuk generate otomatis"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      required={!!editId}
                      readOnly={!!editId}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nama Satuan <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: PIECES"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    required
                  />
                </div>

                {/* Radio Button Status Aktif / Tidak Aktif */}
                <div className="form-group">
                  <label className="form-label">Status <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="unit_status"
                        checked={isActive === true}
                        onChange={() => setIsActive(true)}
                      />
                      Aktif
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="unit_status"
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
