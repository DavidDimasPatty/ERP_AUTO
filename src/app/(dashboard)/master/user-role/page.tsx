'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import SearchableSelect from '@/components/SearchableSelect';
import DataTableClient from '@/components/DataTableClient';

interface UserRole {
  user_id: number;
  role_id: number;
  full_name: string;
  username: string;
  is_active: boolean;
}

export default function UserRolePage() {
  const [data, setData] = useState<UserRole[]>([]);
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
      const res = await fetch(`/api/master/user?limit=1000`);
      const json = await res.ok ? await res.json() : null;
      if (json) {
        // Filter out super admin (user_id === 1)
        setData((json.data || []).filter((u: UserRole) => u.user_id !== 1));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

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
    setFormError('');

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: editId
        ? 'Apakah Anda yakin ingin memperbarui data user ini?'
        : 'Apakah Anda yakin ingin menyimpan user baru ini?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    setFormLoading(true);
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
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menonaktifkan User ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, nonaktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/user/${id}`, { method: 'DELETE' });
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

  const handleHardDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Apakah Anda yakin ingin menghapus user ini secara permanen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    })

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/master/user?id=${id}`, { method: 'DELETE' });
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

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</div>
          ) : (
            <DataTableClient
              isSearchable={true}
              data={data}
              columns={[
                { title: 'Nama', data: 'full_name' },
                { title: 'Role', data: 'username' },
                { title: 'Status', data: null, orderable: false, searchable: false },
                { title: 'Aksi', data: null, orderable: false, searchable: false, className: 'text-center' }
              ]}
              slots={{
                2: (cellData: any, rowData: UserRole) => (
                  <span className={`badge ${rowData.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {rowData.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                ),
                3: (cellData: any, rowData: UserRole) => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(rowData)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      ✏️
                    </button>
                    {rowData.is_active ? (
                      <button
                        onClick={() => handleSoftDelete(rowData.user_id)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        DEACTIVE
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSoftDelete(rowData.user_id)}
                        className="btn btn-success"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        ACTIVE
                      </button>
                    )}
                    <button
                      onClick={() => handleHardDelete(rowData.user_id)}
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      disabled={!rowData.is_active}
                    >
                      🗑️
                    </button>
                  </div>
                )
              }}
              className="display table"
            />
          )}
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
                  <SearchableSelect
                    value={roleId}
                    options={[
                      { value: '1', label: 'Super Admin' },
                      { value: '2', label: 'Kasir' },
                    ]}
                    onChange={(value) => setRoleId(value)}
                    placeholder="Pilih role..."
                    className="form-input"
                  />
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
