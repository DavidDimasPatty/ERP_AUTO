# ERP Auto — Sistem Manajemen Bisnis

Aplikasi ERP (Enterprise Resource Planning) berbasis web untuk manajemen bisnis, dibangun dengan **Next.js**, **Prisma ORM**, dan **MySQL**.

---

## 📋 Daftar Isi

- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [Setup Database](#-setup-database)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Tech Stack](#-tech-stack)

---

## ✅ Prasyarat

Pastikan semua software berikut sudah terinstall sebelum memulai:

### 1. Node.js
- **Versi minimum**: `v20.x` (LTS)
- Download: https://nodejs.org/en/download
- Verifikasi instalasi:
  ```bash
  node -v
  npm -v
  ```

### 2. MySQL
- **Versi**: MySQL `8.x`
- Download: https://dev.mysql.com/downloads/installer/
- Pastikan MySQL Server sudah berjalan dan dapat diakses
- Verifikasi instalasi:
  ```bash
  mysql --version
  ```

### 3. Git *(opsional, untuk clone repo)*
- Download: https://git-scm.com/downloads

---

## 🚀 Instalasi

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/DavidDimasPatty/ERP_AUTO.git
cd ERP_AUTO
```

### Langkah 2 — Install Dependencies

```bash
npm install
```

---

## ⚙️ Konfigurasi Environment

### Langkah 3 — Buat file `.env`

Salin file contoh environment:

```bash
copy .env.example .env
```

Lalu edit file `.env` sesuai konfigurasi lokal kamu:

```env
# Database Connection (MySQL 8)
DATABASE_URL="mysql://username:password@localhost:3306/erp_auto"

# Secret key untuk session (minimal 32 karakter, bebas diisi apa saja)
NEXTAUTH_SECRET="your-32-character-secret-key-here"

# URL aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Penting:** Ganti `username` dan `password` sesuai kredensial MySQL kamu. Default MySQL biasanya `root` dengan password yang kamu set saat instalasi.

---

## 🗄️ Setup Database

### Langkah 4 — Buat Database di MySQL

Masuk ke MySQL dan buat database baru:

```sql
CREATE DATABASE erp_auto;
```

### Langkah 5 — Jalankan Migrasi Database (Prisma)

Perintah ini akan membuat semua tabel secara otomatis berdasarkan schema Prisma:

```bash
npx prisma migrate deploy
```

> Atau jika kamu dalam tahap **development** dan ingin membuat migration baru:
> ```bash
> npx prisma migrate dev
> ```

### Langkah 6 — Generate Prisma Client

```bash
npx prisma generate
```

### Langkah 7 — *(Opsional)* Isi Data Awal (Seed)

Untuk mengisi data awal ke database:

```bash
npx prisma db seed
```

---

## ▶️ Menjalankan Aplikasi

### Mode Development

```bash
npm run dev
```

Buka browser di http://localhost:3000

---

### Mode Production

#### Build terlebih dahulu:

```bash
npm run build
```

#### Lalu jalankan:

```bash
npm run start
```

---

### Cara Cepat (Windows) — Menggunakan `start.bat`

Cukup double-click file **`start.bat`** di root folder.

Script ini akan otomatis:
- Mengecek apakah Node.js terinstall
- Build aplikasi jika belum ada folder `.next`
- Menampilkan IP lokal agar bisa diakses dari perangkat lain di jaringan yang sama
- Membuka browser otomatis ke `http://localhost:3000`

> **Catatan:** Pastikan `.env` sudah dikonfigurasi dan database sudah berjalan sebelum menjalankan `start.bat`.

---

## 🛠️ Tech Stack

| Teknologi | Versi | Keterangan |
|---|---|---|
| [Next.js](https://nextjs.org) | `16.2.12` | React Framework (App Router) |
| [React](https://react.dev) | `19.x` | UI Library |
| [TypeScript](https://www.typescriptlang.org) | `^5` | Type-safe JavaScript |
| [Prisma ORM](https://www.prisma.io) | `^5.22.0` | Database ORM |
| [MySQL](https://www.mysql.com) | `8.x` | Database |
| [Recharts](https://recharts.org) | `^3.10.1` | Chart / Grafik |
| [SweetAlert2](https://sweetalert2.github.io) | `^11` | Dialog / Notifikasi |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | `^3.0.3` | Enkripsi Password |
| [date-fns](https://date-fns.org) | `^4.4.0` | Utilitas Tanggal |

---

## 📁 Struktur Folder

```
ERPAuto/
├── prisma/
│   ├── schema.prisma       # Definisi schema database
│   ├── seed.ts             # Data awal database
│   └── migrations/         # Riwayat migrasi database
├── src/
│   ├── app/                # Halaman Next.js (App Router)
│   └── components/         # Komponen UI
├── public/                 # File statis (gambar, dll)
├── .env                    # Konfigurasi environment (JANGAN di-commit)
├── .env.example            # Contoh konfigurasi environment
├── start.bat               # Script untuk menjalankan di Windows
└── package.json
```

---

## ❗ Troubleshooting

### Error: `Can't reach database server`
- Pastikan MySQL service sudah berjalan
- Cek kembali `DATABASE_URL` di file `.env` (username, password, nama database)

### Error: `@prisma/client did not initialize yet`
- Jalankan ulang: `npx prisma generate`

### Port 3000 sudah dipakai
- Jalankan di port lain: `npm run dev -- -p 3001`

### Build gagal
- Hapus folder `.next` lalu build ulang:
  ```bash
  rmdir /s /q .next
  npm run build
  ```
