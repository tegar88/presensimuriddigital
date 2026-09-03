# ABSEN MURID — Web Dashboard

> "Presensi sederhana, data terintegrasi."

Dashboard web untuk sistem presensi digital sekolah berbasis RFID.

## 🚀 Quick Start

1. Clone / upload folder ini ke GitHub
2. Aktifkan **GitHub Pages** (Settings → Pages → Branch: `main`)
3. Edit `config.js` → isi `API_URL` dengan URL Apps Script Anda
4. Buka `https://username.github.io/absen-murid-web/`

## 🔐 Login Default

- **Admin Secret**: sesuai yang Anda isi di sheet `CONFIG` → `secret_api`
- Secret disimpan di `localStorage` browser Anda (tidak dikirim ke server lain)

## 📱 Fitur

- Dashboard real-time
- Live attendance feed
- Presensi manual (kartu tertinggal)
- Manajemen siswa & kartu RFID
- Pengajuan & verifikasi izin
- Rekap dengan export CSV
- Monitoring device IoT

## 🛠️ Teknologi

- HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- Fetch API
- GitHub Pages (static hosting)
- Backend: Google Apps Script + Google Sheets
