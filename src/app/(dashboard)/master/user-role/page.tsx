'use client';

import React, { useState, useEffect } from 'react';

interface UserRole {
  user_id: number;
  role_id: number;
  full_name: string;
  username: string;
  is_active: boolean;
}

export default function UnitPage() {
  const [data, setData] = useState<UserRole[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/user?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const json = await res.ok ? await res.json() : null;
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
    setUsername('');
    setFullName('');
    setPassword('');
    setRoleId('1');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (unit: UserRole) => {
    setEditId(unit.user_id);
    setUsername(unit.username);
    setFullName(unit.full_name);
    setPassword('');
    setRoleId(unit.role_id.toString());
    setIsActive(unit.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const url = editId ? `/api/master/user/${editId}` : '/api/master/user';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name: fullName,
          ...(password && { password }),
          role_id: parseInt(roleId, 10),
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

  const handleSoftDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan User ini?')) return;
    try {
      const res = await fetch(`/api/master/user/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUnits();
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
          <h1 style={{ fontSize: '2rem' }}>Master User</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Kelola data user
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Tambah User
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <input
          type="text"
          className="form-input"
          style={{ flexGrow: 1 }}
          placeholder="Cari berdasarkan nama atau username"
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
                <th>Nama</th>
                <th>Role</th>
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
                    Tidak ada data user
                  </td>
                </tr>
              ) : (
                data.map((u) => (
                  <tr key={u.user_id}>
                    <td style={{ fontWeight: 700 }}>{u.full_name}</td>
                    <td>{u.username}</td>
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
                      <button
                        onClick={() => handleSoftDelete(u.user_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        disabled={!u.is_active}
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editId ? 'Ubah User' : 'Tambah User Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="close-btn">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                {/* Username */}
                <div className="form-group">
                  <label className="form-label" htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    placeholder="Contoh: johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">Nama Lengkap</label>
                  <input
                    type="text"
                    id="fullName"
                    className="form-input"
                    placeholder="Contoh: John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                {/* Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    placeholder={editId ? "Kosongkan bila tidak ingin mengubah" : "Masukkan password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    {...(!editId && { required: true })}
                  />
                </div>
                {/* Role Dropdown */}
                <div className="form-group">
                  <label className="form-label" htmlFor="roleId">Role</label>
                  <select
                    id="roleId"
                    className="form-input"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                  >
                    <option value="1">Super Admin</option>
                    <option value="2">Kasir</option>
                  </select>
                </div>
                {editId && (
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input
                      type="checkbox"
                      id="mActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="mActive" className="form-label" style={{ cursor: 'pointer', marginBottom: 0 }}>
                      User Aktif
                    </label>
                  </div>
                )}
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
