# Blueprint Studio

Alat rancang platform SaaS: 20 modul rancangan, Mode Lanjutan 15 modul, 4 template + template pribadi, pendeteksi celah, penanda "perlu dicek", versi rancangan (rilis, bandingkan, changelog, Prompt Pembaruan, pemeriksa dampak), pencarian lintas rancangan, pelajaran per versi, kamus istilah SaaS, statistik, dan ekspor Markdown/JSON.

## Penyimpanan
- Database di HP (IndexedDB): kapasitas besar, offline, otomatis. Data lama dari versi sebelumnya dipindahkan otomatis.
- Sinkron cloud (Firebase, opsional): isi `js/config.js` lalu masuk dengan Google di menu Akun. Panduan lengkap ada di zip server (PANDUAN-FIREBASE.md).
- Cadangan manual: menu Akun → Unduh/Salin semua (JSON), dan Impor JSON.

## Susunan file
- index.html
- css/style.css
- js/config.js (FIREBASE_CONFIG — isi sendiri)
- js/data.js (modul, keterkaitan, template)
- js/kamus.js (kamus istilah SaaS)
- js/db.js (database HP + sinkron Firebase)
- js/app.js (logika aplikasi)
- assets/ (ikon)
- manifest.json, sw.js (PWA, bisa dipasang di layar utama & offline)
- _headers, netlify.toml, .nojekyll (pengaturan deploy)

## Deploy ke GitHub Pages
Unggah semua file dengan susunan folder yang sama, lalu Settings → Pages → Deploy from a branch → main → / (root).
Buka `https://NAMAKAMU.github.io/NAMA-REPO/` di Chrome → ⋮ → Instal aplikasi.
