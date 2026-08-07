@echo off
title ERP Auto - Server
color 0A

echo.
echo  ============================================
echo   ERP Auto - Sistem Manajemen Bisnis
echo  ============================================
echo.

:: Cek apakah Node.js terinstall
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [ERROR] Node.js tidak ditemukan!
    echo.
    echo  Silakan install Node.js terlebih dahulu:
    echo  https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

:: Cek apakah folder .next (build) ada
if not exist ".next" (
    color 0E
    echo  [INFO] Build belum ada. Membangun aplikasi...
    echo  Proses ini membutuhkan beberapa menit.
    echo.
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  [ERROR] Build gagal! Periksa koneksi dan coba lagi.
        pause
        exit /b 1
    )
)

:: Dapatkan IP lokal untuk ditampilkan
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  [OK] Node.js ditemukan.
echo  [OK] Build siap.
echo.
echo  ============================================
echo   Server berjalan di:
echo   - Lokal  : http://localhost:3000
echo   - Jaringan: http://%LOCAL_IP%:3000
echo  ============================================
echo.
echo  Bagikan alamat jaringan di atas ke client.
echo  Jangan tutup jendela ini selama server aktif.
echo.

:: Buka browser otomatis setelah 2 detik
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

:: Jalankan server production
call npm run start

pause
