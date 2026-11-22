/* Blueprint Studio — definisi modul, keterkaitan, dan template */
(function () {
  function rows(keys, arr) {
    return arr.map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { o[k] = r[i] || ''; });
      return o;
    });
  }

  var MODULES = [
    { id: 'masalah', nama: 'Masalah & Target', desc: 'Masalah apa yang diselesaikan dan untuk siapa.', fields: [
      { id: 'masalah', label: 'Masalah utama', type: 'textarea', req: 1, hint: 'Apa yang menyulitkan calon pengguna saat ini?' },
      { id: 'target', label: 'Target pengguna', type: 'textarea', req: 1, hint: 'Siapa mereka? Jenis usaha, ukuran, lokasi.' },
      { id: 'sakit', label: 'Titik sakit (pain point)', type: 'list', req: 1, sub: [{ id: 'isi', label: 'Pain point' }] },
      { id: 'solusi', label: 'Solusi singkat', type: 'textarea', req: 1, hint: 'Satu-dua kalimat: bagaimana platform menyelesaikannya.' }
    ] },
    { id: 'nilai', nama: 'Nilai Jual & Pesaing', desc: 'Kenapa orang memilih platformmu, bukan yang lain.', fields: [
      { id: 'usp', label: 'Nilai jual unik', type: 'textarea', req: 1, hint: 'Hal yang paling membedakan, dalam satu kalimat.' },
      { id: 'pesaing', label: 'Pesaing', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama' }, { id: 'kuat', label: 'Kelebihan' }, { id: 'lemah', label: 'Kelemahan' }] },
      { id: 'beda', label: 'Alasan pengguna pindah ke kita', type: 'textarea' }
    ] },
    { id: 'peran', nama: 'Peran & Hak Akses', desc: 'Siapa saja yang memakai platform dan boleh melakukan apa.', fields: [
      { id: 'daftar', label: 'Peran pengguna', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama peran' }, { id: 'desk', label: 'Siapa mereka' }, { id: 'akses', label: 'Boleh melakukan apa', type: 'textarea' }] }
    ] },
    { id: 'fitur', nama: 'Fitur', desc: 'Daftar fitur, dipisah antara MVP (versi pertama) dan nanti.', fields: [
      { id: 'daftar', label: 'Fitur', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama fitur' }, { id: 'peran', label: 'Dipakai peran (pisahkan koma)' }, { id: 'prioritas', label: 'Prioritas', type: 'select', options: ['MVP', 'Nanti'] }, { id: 'desk', label: 'Penjelasan', type: 'textarea' }] }
    ] },
    { id: 'alur', nama: 'Alur Pengguna', desc: 'Langkah demi langkah yang dilalui setiap peran.', fields: [
      { id: 'daftar', label: 'Alur', type: 'list', req: 1, sub: [{ id: 'peran', label: 'Peran' }, { id: 'judul', label: 'Judul alur' }, { id: 'langkah', label: 'Langkah (satu per baris)', type: 'textarea' }] }
    ] },
    { id: 'data', nama: 'Struktur Data', desc: 'Tabel/koleksi, isiannya, dan hubungannya.', fields: [
      { id: 'daftar', label: 'Entitas data', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama entitas' }, { id: 'isian', label: 'Isian (satu per baris)', type: 'textarea' }, { id: 'relasi', label: 'Hubungan dengan entitas lain' }] }
    ] },
    { id: 'halaman', nama: 'Halaman & Layar', desc: 'Semua halaman yang perlu dibuat.', fields: [
      { id: 'daftar', label: 'Halaman', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama halaman' }, { id: 'peran', label: 'Untuk peran' }, { id: 'isi', label: 'Isi halaman', type: 'textarea' }] }
    ] },
    { id: 'bisnis', nama: 'Model Bisnis', desc: 'Paket langganan, harga, dan batas kuota.', fields: [
      { id: 'paket', label: 'Paket langganan', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Nama paket' }, { id: 'harga', label: 'Harga (Rp/bulan)', type: 'number' }, { id: 'batas', label: 'Batas kuota', type: 'textarea' }, { id: 'fitur', label: 'Fitur yang didapat', type: 'textarea' }] },
      { id: 'trial', label: 'Masa uji coba', type: 'text', hint: 'Mis. Pro gratis 14 hari' },
      { id: 'lain', label: 'Pendapatan lain', type: 'textarea', hint: 'Komisi, iklan, jasa setup, dll.' }
    ] },
    { id: 'tenant', nama: 'Pemisahan Data Antar-Toko', desc: 'Cara satu platform melayani banyak toko/klien (multi-tenant).', fields: [
      { id: 'model', label: 'Model', type: 'select', req: 1, options: ['', 'Path per toko (domain.com/toko)', 'Subdomain per toko (toko.domain.com)', 'Satu aplikasi untuk semua (tanpa toko terpisah)'] },
      { id: 'isolasi', label: 'Cara memisahkan data', type: 'textarea', req: 1, hint: 'Mis. setiap dokumen menyimpan tokoId.' },
      { id: 'onboarding', label: 'Langkah klien baru mendaftar', type: 'textarea', req: 1 }
    ] },
    { id: 'teknologi', nama: 'Teknologi & Biaya', desc: 'Alat yang dipakai dan perkiraan biaya bulanan.', fields: [
      { id: 'frontend', label: 'Tampilan (frontend)', type: 'text', req: 1 },
      { id: 'backend', label: 'Server (backend)', type: 'text', req: 1 },
      { id: 'database', label: 'Database', type: 'text', req: 1 },
      { id: 'storage', label: 'Penyimpanan file/gambar', type: 'text' },
      { id: 'hosting', label: 'Hosting', type: 'text', req: 1 },
      { id: 'biaya', label: 'Perkiraan biaya', type: 'textarea', req: 1 }
    ] },
    { id: 'keamanan', nama: 'Keamanan & Aturan', desc: 'Aturan akses data, privasi, dan syarat layanan.', fields: [
      { id: 'rules', label: 'Aturan akses data (rules)', type: 'textarea', req: 1, hint: 'Siapa boleh membaca/menulis data apa.' },
      { id: 'privasi', label: 'Privasi data pengguna', type: 'textarea', req: 1 },
      { id: 'syarat', label: 'Syarat layanan', type: 'textarea', req: 1, hint: 'Larangan, pembatalan, pengembalian dana.' },
      { id: 'backup', label: 'Cadangan data (backup)', type: 'textarea' }
    ] },
    { id: 'integrasi', nama: 'Integrasi', desc: 'Layanan luar: WhatsApp, pembayaran, notifikasi.', fields: [
      { id: 'daftar', label: 'Integrasi', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Layanan' }, { id: 'tujuan', label: 'Untuk apa' }, { id: 'pemicu', label: 'Kapan dipicu' }] }
    ] },
    { id: 'admin', nama: 'Panel Admin & Metrik', desc: 'Alat pengelola platform dan angka yang dipantau.', fields: [
      { id: 'fitur', label: 'Fitur panel admin', type: 'textarea', req: 1 },
      { id: 'metrik', label: 'Metrik yang dipantau', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Metrik' }, { id: 'target', label: 'Target' }] }
    ] },
    { id: 'peluncuran', nama: 'Peluncuran & Roadmap', desc: 'Tahapan sampai rilis dan cara mendapatkan pengguna.', fields: [
      { id: 'target', label: 'Target rilis', type: 'text' },
      { id: 'fase', label: 'Tahapan', type: 'list', req: 1, sub: [{ id: 'fase', label: 'Tahap' }, { id: 'isi', label: 'Yang dikerjakan', type: 'textarea' }, { id: 'waktu', label: 'Waktu' }] },
      { id: 'pemasaran', label: 'Strategi mendapatkan pengguna', type: 'textarea', req: 1 }
    ] }
  ];

  /* Kalau modul kunci diubah, modul-modul ini ditandai "perlu dicek" */
  var DEPS = {
    peran: ['fitur', 'alur', 'halaman', 'keamanan'],
    fitur: ['alur', 'halaman', 'data', 'bisnis'],
    bisnis: ['fitur', 'halaman', 'admin', 'keamanan'],
    data: ['keamanan', 'tenant'],
    tenant: ['data', 'keamanan', 'teknologi'],
    alur: ['halaman'],
    integrasi: ['teknologi', 'keamanan'],
    teknologi: ['keamanan']
  };

  var R = ['nama', 'desk', 'akses'], F = ['nama', 'peran', 'prioritas', 'desk'], A = ['peran', 'judul', 'langkah'];
  var D = ['nama', 'isian', 'relasi'], H = ['nama', 'peran', 'isi'], P = ['nama', 'harga', 'batas', 'fitur'];
  var I = ['nama', 'tujuan', 'pemicu'], M = ['nama', 'target'], S = ['fase', 'isi', 'waktu'], K = ['nama', 'kuat', 'lemah'];

  var TEMPLATES = [
    { id: 'kosong', nama: 'Kosong', desc: 'Mulai dari nol, isi semua modul sendiri.', data: {} },

    { id: 'katalog', nama: 'Katalog UMKM + order WhatsApp', desc: 'Toko online sederhana per UMKM, pesanan masuk ke WhatsApp.', data: {
      masalah: { masalah: 'UMKM berjualan lewat WhatsApp dan Instagram, tapi daftar produk dan harga tersebar di chat. Pelanggan bolak-balik bertanya stok dan harga.', target: 'UMKM kuliner, fashion, dan kerajinan di Indonesia yang berjualan lewat WhatsApp, dikelola 1-5 orang.', sakit: rows(['isi'], [['Harus mengirim foto dan harga satu per satu'], ['Pesanan tercecer di chat'], ['Tidak punya website karena mahal']]), solusi: 'Katalog online per toko dengan link sendiri. Pelanggan memilih produk, lalu pesanan terkirim rapi ke WhatsApp penjual.' },
      nilai: { usp: 'Toko siap dalam 5 menit dari HP, tanpa potongan per pesanan, pesanan langsung masuk WhatsApp.', pesaing: rows(K, [['Linktree', 'Mudah dibuat', 'Bukan katalog produk'], ['Marketplace besar', 'Banyak pembeli', 'Potongan biaya dan perang harga']]), beda: 'Toko punya merek dan pelanggan sendiri, tanpa potongan.' },
      peran: { daftar: rows(R, [['Admin platform', 'Kamu sebagai pengelola SaaS', 'Melihat semua toko, mengubah paket, menonaktifkan toko'], ['Pemilik toko', 'Pelaku UMKM yang berlangganan', 'Mengelola toko, produk, dan pesanan miliknya sendiri'], ['Pelanggan', 'Pembeli yang membuka link toko', 'Melihat katalog dan mengirim pesanan']]) },
      fitur: { daftar: rows(F, [['Daftar dan buat toko', 'Pemilik toko', 'MVP', 'Login Google, isi nama toko dan nomor WhatsApp'], ['Kelola produk dan kategori', 'Pemilik toko', 'MVP', 'Tambah, ubah, hapus produk dengan foto'], ['Katalog publik', 'Pelanggan', 'MVP', 'Halaman toko dengan link sendiri'], ['Keranjang dan kirim pesanan ke WhatsApp', 'Pelanggan', 'MVP', 'Pesan teks rapi berisi daftar barang dan total'], ['Bayar langganan', 'Pemilik toko', 'MVP', 'Upgrade paket lewat QRIS'], ['Kelola toko dan paket', 'Admin platform', 'MVP', 'Daftar toko, ubah paket, nonaktifkan'], ['Riwayat pesanan', 'Pemilik toko', 'Nanti', 'Catatan pesanan yang dikirim'], ['Domain sendiri', 'Pemilik toko', 'Nanti', 'tokosaya.com']]) },
      alur: { daftar: rows(A, [['Pemilik toko', 'Membuka toko', 'Daftar dengan Google\nIsi nama toko dan nomor WhatsApp\nTambah produk pertama\nBagikan link toko'], ['Pelanggan', 'Memesan', 'Buka link toko\nPilih produk ke keranjang\nIsi nama\nTekan Pesan, WhatsApp terbuka dengan pesan siap kirim'], ['Admin platform', 'Mengaktifkan paket', 'Lihat pembayaran masuk\nCocokkan dengan toko\nAktifkan paket']]) },
      data: { daftar: rows(D, [['Pengguna', 'id\nemail\nnama\nperan', 'Satu pengguna memiliki satu toko'], ['Toko', 'id\nnama\nslug\nnoWhatsApp\nlogo\npaket\naktifSampai\npemilikId', 'Punya banyak Produk dan Kategori'], ['Kategori', 'id\ntokoId\nnama\nurutan', 'Milik satu Toko'], ['Produk', 'id\ntokoId\nkategoriId\nnama\nharga\nfoto\nstok\naktif', 'Milik satu Toko dan satu Kategori'], ['Pesanan', 'id\ntokoId\nitem\ntotal\nnamaPelanggan\nwaktu', 'Milik satu Toko']]) },
      halaman: { daftar: rows(H, [['Landing', 'Pelanggan', 'Penjelasan produk, harga paket, tombol daftar'], ['Login / Daftar', 'Pemilik toko', 'Masuk dengan Google'], ['Dasbor toko', 'Pemilik toko', 'Ringkasan, link toko, status paket'], ['Kelola produk', 'Pemilik toko', 'Daftar produk, form tambah/ubah'], ['Katalog publik', 'Pelanggan', 'Produk per kategori, pencarian'], ['Keranjang', 'Pelanggan', 'Daftar barang, total, tombol Pesan via WhatsApp'], ['Panel admin', 'Admin platform', 'Daftar toko, pembayaran, metrik']]) },
      bisnis: { paket: rows(P, [['Gratis', '0', 'Maks 10 produk, ada tanda nama platform', 'Katalog dan order WhatsApp'], ['Pro', '29000', 'Maks 200 produk', 'Tanpa tanda platform, kategori tak terbatas'], ['Bisnis', '79000', 'Produk tak terbatas', 'Domain sendiri, riwayat pesanan, laporan']]), trial: 'Pro gratis 14 hari', lain: 'Jasa setup toko untuk UMKM yang tidak mau repot.' },
      tenant: { model: 'Path per toko (domain.com/toko)', isolasi: 'Setiap dokumen menyimpan tokoId. Aturan database hanya mengizinkan pemilik menulis data dengan tokoId miliknya.', onboarding: 'Daftar dengan Google, isi nama toko dan nomor WhatsApp, tambah produk pertama, link toko langsung jadi.' },
      teknologi: { frontend: 'HTML, CSS, JavaScript', backend: 'Cloudflare Workers', database: 'Firestore', storage: 'Cloudflare R2 untuk foto produk', hosting: 'Cloudflare Pages', biaya: 'Awal: kuota gratis Firebase dan Cloudflare. Domain sekitar Rp150 ribu per tahun.' },
      keamanan: { rules: 'Pelanggan hanya membaca produk aktif. Pemilik toko hanya mengubah data tokonya sendiri. Admin membaca semua data.', privasi: 'Nama dan nomor pelanggan hanya terlihat oleh toko terkait.', syarat: 'Larangan produk ilegal. Toko yang melanggar dinonaktifkan. Langganan tidak dapat dikembalikan setelah periode berjalan.', backup: 'Ekspor database setiap minggu.' },
      integrasi: { daftar: rows(I, [['WhatsApp (link wa.me)', 'Mengirim pesanan ke penjual', 'Saat pelanggan menekan Pesan'], ['Pembayaran QRIS (Midtrans/Xendit)', 'Membayar langganan', 'Saat pemilik toko upgrade paket']]) },
      admin: { fitur: 'Daftar toko, cari toko, ubah paket, aktif/nonaktifkan toko, riwayat pembayaran.', metrik: rows(M, [['Toko baru per minggu', '20'], ['Persentase toko berbayar', '10%'], ['Pesanan terkirim per hari', '100']]) },
      peluncuran: { target: '', fase: rows(S, [['Prototipe MVP', 'Semua fitur MVP', '4 minggu'], ['Uji coba', '10 UMKM kenalan memakai gratis dan memberi masukan', '2 minggu'], ['Rilis publik', 'Buka pendaftaran dan paket berbayar', 'Minggu ke-7']]), pemasaran: 'Konten TikTok dan Instagram cara membuat katalog dalam 5 menit. Tawarkan langsung ke UMKM sekitar.' }
    } },

    { id: 'jasa', nama: 'Marketplace jasa (mis. push rank)', desc: 'Pelanggan memesan jasa dari mitra penyedia, platform mengambil komisi.', data: {
      masalah: { masalah: 'Pelanggan jasa push rank sulit menemukan penyedia yang terpercaya, dan penyedia sulit mendapat pelanggan tetap.', target: 'Pemain game mobile (mis. Mobile Legends) dan para joki/penyedia jasa di Indonesia.', sakit: rows(['isi'], [['Takut akun dibawa kabur'], ['Harga tidak jelas'], ['Progres pengerjaan tidak terpantau']]), solusi: 'Marketplace jasa dengan profil penyedia, rating, harga jelas, dan progres pesanan yang terpantau.' },
      nilai: { usp: 'Penyedia terverifikasi, progres pesanan terlihat, ada penyelesaian sengketa.', pesaing: rows(K, [['Grup Facebook/Telegram', 'Banyak penyedia', 'Rawan penipuan'], ['Marketplace umum', 'Ada pembayaran aman', 'Tidak khusus jasa game']]), beda: 'Khusus jasa game, ada verifikasi penyedia dan riwayat rating.' },
      peran: { daftar: rows(R, [['Admin platform', 'Pengelola SaaS', 'Verifikasi mitra, menangani sengketa, mengatur komisi'], ['Mitra penyedia', 'Joki/penyedia jasa', 'Membuat layanan, menerima pesanan, memperbarui progres'], ['Pelanggan', 'Pemain yang memesan', 'Mencari layanan, memesan, memberi rating'], ['Moderator', 'Pembantu admin', 'Memeriksa laporan dan ulasan']]) },
      fitur: { daftar: rows(F, [['Profil dan layanan mitra', 'Mitra penyedia', 'MVP', 'Daftar layanan, harga per bintang/tier'], ['Pencarian layanan', 'Pelanggan', 'MVP', 'Filter game, rank, harga, rating'], ['Pemesanan via WhatsApp', 'Pelanggan', 'MVP', 'Pesanan tercatat lalu diteruskan ke WhatsApp mitra'], ['Progres pesanan', 'Mitra penyedia, Pelanggan', 'MVP', 'Status: diterima, dikerjakan, selesai'], ['Rating dan ulasan', 'Pelanggan', 'MVP', 'Setelah pesanan selesai'], ['Verifikasi mitra', 'Admin platform', 'MVP', 'Cek identitas dan bukti pengalaman'], ['Laporan dan sengketa', 'Pelanggan, Moderator', 'Nanti', 'Lapor masalah pesanan'], ['Push rank: posisi teratas', 'Mitra penyedia', 'Nanti', 'Mitra membayar agar tampil di atas']]) },
      alur: { daftar: rows(A, [['Mitra penyedia', 'Mulai berjualan', 'Daftar\nKirim data verifikasi\nTunggu disetujui\nBuat layanan dan harga'], ['Pelanggan', 'Memesan jasa', 'Cari layanan\nLihat profil dan rating mitra\nPesan\nPantau progres\nBeri rating'], ['Admin platform', 'Verifikasi mitra', 'Buka antrean verifikasi\nPeriksa data\nSetujui atau tolak'], ['Moderator', 'Menangani laporan', 'Buka laporan\nHubungi kedua pihak\nTandai selesai']]) },
      data: { daftar: rows(D, [['Pengguna', 'id\nemail\nnama\nperan\nnoWhatsApp', ''], ['Mitra', 'id\npenggunaId\nstatusVerifikasi\nrating\njumlahPesanan', 'Milik satu Pengguna'], ['Layanan', 'id\nmitraId\ngame\njudul\nharga\nestimasiHari\naktif', 'Milik satu Mitra'], ['Pesanan', 'id\nlayananId\nmitraId\npelangganId\nstatus\ntotal\nwaktu', 'Menghubungkan Pelanggan dan Mitra'], ['Ulasan', 'id\npesananId\nrating\nkomentar', 'Milik satu Pesanan'], ['Laporan', 'id\npesananId\nisi\nstatus', 'Milik satu Pesanan']]) },
      halaman: { daftar: rows(H, [['Beranda dan pencarian', 'Pelanggan', 'Layanan populer, filter'], ['Login / Daftar', 'Pelanggan, Mitra penyedia', 'Masuk dengan Google'], ['Profil mitra', 'Pelanggan', 'Layanan, rating, ulasan'], ['Detail pesanan', 'Pelanggan, Mitra penyedia', 'Status dan progres'], ['Dasbor mitra', 'Mitra penyedia', 'Pesanan masuk, layanan, pendapatan'], ['Panel admin', 'Admin platform', 'Verifikasi, komisi, metrik'], ['Antrean laporan', 'Moderator', 'Daftar laporan']]) },
      bisnis: { paket: rows(P, [['Mitra Gratis', '0', 'Maks 3 layanan aktif', 'Tampil di pencarian biasa'], ['Mitra Pro', '49000', 'Maks 20 layanan', 'Lencana Pro, statistik'], ['Push rank', '25000', 'Per 7 hari per layanan', 'Tampil paling atas di pencarian']]), trial: '', lain: 'Komisi per pesanan bila nanti pembayaran lewat platform.' },
      tenant: { model: 'Satu aplikasi untuk semua (tanpa toko terpisah)', isolasi: 'Data mitra dipisah dengan mitraId; pesanan hanya terlihat oleh pelanggan dan mitranya.', onboarding: 'Daftar, verifikasi, buat layanan pertama.' },
      teknologi: { frontend: 'HTML, CSS, JavaScript', backend: 'Cloudflare Workers', database: 'Firestore', storage: 'Cloudflare R2', hosting: 'Cloudflare Pages', biaya: 'Awal gratis; naik sesuai jumlah pesanan dan foto.' },
      keamanan: { rules: 'Pesanan hanya dibaca pelanggan dan mitra terkait. Hanya admin yang mengubah status verifikasi. Ulasan hanya dari pelanggan pesanan itu.', privasi: 'Data login akun game tidak disimpan di platform; dibagikan langsung lewat WhatsApp.', syarat: 'Risiko akun ditanggung bersama sesuai kesepakatan; mitra curang diblokir.', backup: 'Ekspor database mingguan.' },
      integrasi: { daftar: rows(I, [['WhatsApp', 'Menghubungkan pelanggan dan mitra', 'Saat pesanan dibuat'], ['Pembayaran QRIS', 'Membayar paket mitra dan push rank', 'Saat mitra membeli paket']]) },
      admin: { fitur: 'Antrean verifikasi, daftar mitra, blokir pengguna, atur harga push rank, metrik.', metrik: rows(M, [['Mitra aktif', '50'], ['Pesanan selesai per minggu', '200'], ['Rating rata-rata', '4,5']]) },
      peluncuran: { target: '', fase: rows(S, [['Prototipe MVP', 'Fitur MVP', '5 minggu'], ['Rekrut mitra awal', '20 mitra dari komunitas Telegram', '2 minggu'], ['Rilis publik', 'Buka untuk pelanggan', 'Minggu ke-8']]), pemasaran: 'Promosi di komunitas Telegram dan TikTok gaming; mitra awal gratis Pro 1 bulan.' }
    } },

    { id: 'cafe', nama: 'POS & manajemen cafe', desc: 'Kasir, menu, pesanan meja, dan laporan untuk banyak cafe.', data: {
      masalah: { masalah: 'Cafe kecil masih mencatat pesanan manual; stok dan laporan penjualan tidak rapi.', target: 'Cafe dan kedai kopi kecil-menengah dengan 2-15 karyawan.', sakit: rows(['isi'], [['Pesanan salah atau terlewat'], ['Tidak tahu menu terlaris'], ['Aplikasi kasir lain mahal']]), solusi: 'Aplikasi kasir di HP/tablet dengan pesanan meja lewat QR dan laporan otomatis.' },
      nilai: { usp: 'Kasir, pesanan QR meja, dan laporan dalam satu aplikasi web yang jalan di HP.', pesaing: rows(K, [['Aplikasi kasir besar', 'Fitur lengkap', 'Biaya bulanan tinggi'], ['Catatan manual', 'Gratis', 'Rawan salah']]), beda: 'Lebih murah dan tidak perlu perangkat khusus.' },
      peran: { daftar: rows(R, [['Admin platform', 'Pengelola SaaS', 'Mengelola cafe dan paket'], ['Pemilik cafe', 'Pelanggan SaaS', 'Mengatur menu, karyawan, melihat laporan'], ['Kasir', 'Karyawan', 'Membuat transaksi dan menerima pembayaran'], ['Dapur', 'Barista/koki', 'Melihat dan menyelesaikan pesanan'], ['Pelanggan', 'Tamu cafe', 'Memesan dari meja lewat QR']]) },
      fitur: { daftar: rows(F, [['Kelola menu', 'Pemilik cafe', 'MVP', 'Kategori, harga, varian'], ['Kasir', 'Kasir', 'MVP', 'Transaksi, diskon, metode bayar'], ['Layar dapur', 'Dapur', 'MVP', 'Antrean pesanan'], ['Pesan dari meja via QR', 'Pelanggan', 'MVP', 'Scan QR meja, pilih menu'], ['Laporan penjualan', 'Pemilik cafe', 'MVP', 'Harian, menu terlaris'], ['Kelola karyawan', 'Pemilik cafe', 'MVP', 'Undang kasir/dapur'],
        ['Kelola cafe dan paket', 'Admin platform', 'MVP', 'Daftar cafe, ubah paket, nonaktifkan'], ['Stok bahan', 'Pemilik cafe', 'Nanti', 'Bahan berkurang otomatis'], ['Program poin pelanggan', 'Pelanggan', 'Nanti', '']]) },
      alur: { daftar: rows(A, [['Pemilik cafe', 'Membuka cafe', 'Daftar\nIsi profil cafe\nTambah menu\nUndang karyawan\nCetak QR meja'], ['Kasir', 'Transaksi', 'Pilih menu\nTerapkan diskon\nPilih metode bayar\nSimpan'], ['Dapur', 'Menyiapkan pesanan', 'Lihat antrean\nTandai sedang dibuat\nTandai siap'], ['Pelanggan', 'Pesan dari meja', 'Scan QR\nPilih menu\nKirim pesanan\nBayar di kasir'], ['Admin platform', 'Mengaktifkan paket', 'Lihat pembayaran masuk\nCocokkan dengan cafe\nAktifkan paket']]) },
      data: { daftar: rows(D, [['Cafe', 'id\nnama\nalamat\npaket\npemilikId', 'Punya banyak Menu, Karyawan, Meja'], ['Karyawan', 'id\ncafeId\npenggunaId\nperan', 'Milik satu Cafe'], ['Menu', 'id\ncafeId\nkategori\nnama\nharga\nvarian\naktif', 'Milik satu Cafe'], ['Meja', 'id\ncafeId\nnomor\nkodeQR', 'Milik satu Cafe'], ['Pesanan', 'id\ncafeId\nmejaId\nitem\nstatus\ntotal\nmetodeBayar\nwaktu', 'Milik satu Cafe']]) },
      halaman: { daftar: rows(H, [['Login / Daftar', 'Pemilik cafe, Kasir, Dapur', 'Masuk'], ['Kasir', 'Kasir', 'Grid menu dan keranjang'], ['Layar dapur', 'Dapur', 'Kartu pesanan'], ['Menu meja (QR)', 'Pelanggan', 'Menu dan keranjang'], ['Laporan', 'Pemilik cafe', 'Grafik penjualan'], ['Pengaturan cafe', 'Pemilik cafe', 'Menu, karyawan, meja'], ['Panel admin', 'Admin platform', 'Daftar cafe dan paket']]) },
      bisnis: { paket: rows(P, [['Starter', '0', '1 kasir, 30 menu', 'Kasir dan laporan harian'], ['Pro', '99000', '5 karyawan, menu tak terbatas', 'QR meja, layar dapur'], ['Multi cabang', '249000', 'Hingga 5 cabang', 'Laporan gabungan']]), trial: 'Pro gratis 14 hari', lain: 'Jasa setup menu dan cetak QR.' },
      tenant: { model: 'Subdomain per toko (toko.domain.com)', isolasi: 'Semua data menyimpan cafeId; karyawan hanya bisa mengakses cafe tempatnya bekerja.', onboarding: 'Daftar, isi profil cafe, impor menu, undang karyawan.' },
      teknologi: { frontend: 'HTML, CSS, JavaScript (PWA, bisa offline)', backend: 'Cloudflare Workers', database: 'Firestore', storage: 'Cloudflare R2', hosting: 'Cloudflare Pages', biaya: 'Awal gratis; naik sesuai jumlah transaksi.' },
      keamanan: { rules: 'Karyawan hanya membaca/menulis data cafeId miliknya. Kasir tidak bisa menghapus transaksi. Pelanggan hanya membuat pesanan.', privasi: 'Tidak menyimpan data pribadi tamu selain nama panggilan.', syarat: 'Langganan bulanan, bisa berhenti kapan saja.', backup: 'Ekspor harian laporan.' },
      integrasi: { daftar: rows(I, [['QRIS', 'Pembayaran pelanggan dan langganan', 'Saat transaksi/upgrade'], ['Printer struk Bluetooth', 'Cetak struk', 'Setelah transaksi'], ['WhatsApp', 'Kirim struk digital', 'Opsional setelah transaksi']]) },
      admin: { fitur: 'Daftar cafe, paket, pembayaran, dukungan.', metrik: rows(M, [['Cafe aktif', '30'], ['Transaksi per hari', '1000'], ['Cafe yang berhenti per bulan', 'di bawah 5%']]) },
      peluncuran: { target: '', fase: rows(S, [['Prototipe MVP', 'Kasir, menu, laporan', '5 minggu'], ['Uji coba', '3 cafe sekitar', '3 minggu'], ['Rilis publik', 'Paket berbayar', 'Minggu ke-9']]), pemasaran: 'Datangi cafe langsung dan beri uji coba gratis; konten video sebelum/sesudah.' }
    } },

    { id: 'retur', nama: 'Platform retur toko online', desc: 'Pembeli mengajukan retur, toko memproses dengan rapi.', data: {
      masalah: { masalah: 'Toko online kewalahan menangani retur lewat chat; bukti dan status retur tidak tercatat.', target: 'Toko fashion online dengan puluhan retur per minggu.', sakit: rows(['isi'], [['Bukti foto/video tercecer'], ['Pembeli terus menanyakan status'], ['Tidak tahu alasan retur terbanyak']]), solusi: 'Formulir retur online dengan bukti, status terpantau, dan laporan alasan retur.' },
      nilai: { usp: 'Retur tercatat rapi dari pengajuan sampai selesai, pembeli bisa cek status sendiri.', pesaing: rows(K, [['Chat manual', 'Gratis', 'Berantakan'], ['Fitur retur marketplace', 'Terintegrasi', 'Hanya untuk penjualan di marketplace itu']]), beda: 'Bisa dipakai untuk semua kanal penjualan toko.' },
      peran: { daftar: rows(R, [['Admin platform', 'Pengelola SaaS', 'Mengelola toko dan paket'], ['Pemilik toko', 'Pelanggan SaaS', 'Mengatur kebijakan retur, melihat laporan'], ['Staf gudang', 'Karyawan toko', 'Memeriksa barang retur dan memperbarui status'], ['Pembeli', 'Pelanggan toko', 'Mengajukan retur dan memantau status']]) },
      fitur: { daftar: rows(F, [['Formulir retur', 'Pembeli', 'MVP', 'Nomor pesanan, alasan, foto/video'], ['Cek status retur', 'Pembeli', 'MVP', 'Dengan kode retur'], ['Antrean retur', 'Staf gudang', 'MVP', 'Setujui, tolak, terima barang'], ['Kebijakan retur', 'Pemilik toko', 'MVP', 'Batas hari, alasan yang diterima'], ['Laporan alasan retur', 'Pemilik toko', 'MVP', ''], ['Kelola toko dan paket', 'Admin platform', 'MVP', 'Daftar toko, ubah paket, nonaktifkan'], ['Notifikasi WhatsApp', 'Pembeli', 'Nanti', 'Kabar saat status berubah']]) },
      alur: { daftar: rows(A, [['Pembeli', 'Mengajukan retur', 'Buka link retur toko\nIsi nomor pesanan dan alasan\nUnggah bukti\nDapat kode retur'], ['Staf gudang', 'Memproses retur', 'Buka antrean\nPeriksa bukti\nSetujui\nTerima barang\nTandai selesai'], ['Pemilik toko', 'Mengatur kebijakan', 'Isi batas hari retur\nPilih alasan yang diterima\nSimpan'], ['Admin platform', 'Mengaktifkan paket', 'Lihat pembayaran masuk\nCocokkan dengan toko\nAktifkan paket']]) },
      data: { daftar: rows(D, [['Toko', 'id\nnama\nslug\npaket\nkebijakan', ''], ['Staf', 'id\ntokoId\npenggunaId\nperan', 'Milik satu Toko'], ['Retur', 'id\ntokoId\nkode\nnomorPesanan\nalasan\nbukti\nstatus\nwaktu', 'Milik satu Toko'], ['RiwayatStatus', 'id\nreturId\nstatus\noleh\nwaktu', 'Milik satu Retur']]) },
      halaman: { daftar: rows(H, [['Formulir retur', 'Pembeli', 'Form dan unggah bukti'], ['Cek status', 'Pembeli', 'Masukkan kode retur'], ['Login', 'Pemilik toko, Staf gudang', 'Masuk'], ['Antrean retur', 'Staf gudang', 'Daftar dan detail retur'], ['Laporan', 'Pemilik toko', 'Alasan retur terbanyak'], ['Panel admin', 'Admin platform', 'Toko dan paket']]) },
      bisnis: { paket: rows(P, [['Gratis', '0', '30 retur per bulan', 'Formulir dan antrean'], ['Pro', '59000', '500 retur per bulan', 'Laporan, 5 staf'], ['Bisnis', '149000', 'Tak terbatas', 'Notifikasi WhatsApp, banyak toko']]), trial: '', lain: '' },
      tenant: { model: 'Path per toko (domain.com/toko)', isolasi: 'Setiap retur menyimpan tokoId; staf hanya melihat retur tokonya.', onboarding: 'Daftar, buat toko, atur kebijakan, bagikan link retur.' },
      teknologi: { frontend: 'HTML, CSS, JavaScript', backend: 'Cloudflare Workers', database: 'Firestore', storage: 'Cloudflare R2 untuk foto/video bukti', hosting: 'Cloudflare Pages', biaya: 'Terbesar di penyimpanan video bukti; batasi ukuran unggahan.' },
      keamanan: { rules: 'Pembeli hanya membuat retur dan membaca retur dengan kodenya. Staf hanya mengakses tokoId miliknya.', privasi: 'Foto/video bukti dihapus otomatis 90 hari setelah selesai.', syarat: 'Kebijakan retur ditentukan masing-masing toko.', backup: 'Ekspor mingguan.' },
      integrasi: { daftar: rows(I, [['WhatsApp', 'Kabar status retur', 'Saat status berubah'], ['Pembayaran QRIS', 'Langganan', 'Saat upgrade']]) },
      admin: { fitur: 'Daftar toko, paket, pemakaian penyimpanan.', metrik: rows(M, [['Toko aktif', '40'], ['Retur diproses per minggu', '500'], ['Rata-rata waktu proses', 'di bawah 2 hari']]) },
      peluncuran: { target: '', fase: rows(S, [['Prototipe MVP', 'Formulir, antrean, laporan', '4 minggu'], ['Uji coba', 'Dipakai di toko sendiri dulu', '2 minggu'], ['Rilis publik', 'Tawarkan ke toko lain', 'Minggu ke-7']]), pemasaran: 'Pakai di toko sendiri lalu ceritakan hasilnya; tawarkan ke sesama penjual fashion.' }
    } }
  ];

  /* =========================================================
     MODUL TAMBAHAN SaaS (wajib) + MODE LANJUTAN (opsional)
     ========================================================= */
  function insertAfter(afterId, mod) {
    var i = MODULES.map(function (m) { return m.id; }).indexOf(afterId);
    MODULES.splice(i + 1, 0, mod);
  }
  function addFields(modId, fields) {
    var m = MODULES.filter(function (x) { return x.id === modId; })[0];
    m.fields = m.fields.concat(fields);
  }

  insertAfter('peran', { id: 'tim', nama: 'Tim & Undangan', desc: 'Cara pemilik akun mengajak staf dan mengatur akses mereka.', fields: [
    { id: 'undang', label: 'Cara mengundang anggota', type: 'textarea', req: 1, hint: 'Lewat email, link undangan, atau kode.' },
    { id: 'batas', label: 'Batas anggota per paket', type: 'textarea' },
    { id: 'cabut', label: 'Cara mencabut akses', type: 'textarea', req: 1 },
    { id: 'transfer', label: 'Pindah kepemilikan akun', type: 'textarea' }
  ] });
  insertAfter('alur', { id: 'onboarding', nama: 'Onboarding & Aktivasi', desc: 'Langkah pengguna baru sampai pertama kali merasakan manfaat.', fields: [
    { id: 'langkah', label: 'Langkah onboarding', type: 'list', req: 1, sub: [{ id: 'langkah', label: 'Langkah' }, { id: 'tujuan', label: 'Tujuan langkah' }] },
    { id: 'aha', label: 'Momen "aha" (pertama merasakan manfaat)', type: 'textarea', req: 1, hint: 'Mis. pesanan pertama masuk ke WhatsApp.' },
    { id: 'sambutan', label: 'Pesan sambutan (email/WA)', type: 'textarea' },
    { id: 'bantuan', label: 'Bantuan awal (tur, contoh data)', type: 'textarea' }
  ] });
  insertAfter('bisnis', { id: 'tagihan', nama: 'Tagihan & Kuota', desc: 'Perpanjangan, gagal bayar, ganti paket, dan penegakan kuota.', fields: [
    { id: 'perpanjangan', label: 'Cara perpanjangan', type: 'textarea', req: 1, hint: 'Otomatis atau manual? Kapan pengingat dikirim?' },
    { id: 'gagal', label: 'Saat pembayaran gagal / telat', type: 'textarea', req: 1, hint: 'Masa tenggang berapa hari, lalu apa yang terjadi.' },
    { id: 'ubah', label: 'Naik / turun paket di tengah periode', type: 'textarea', req: 1 },
    { id: 'kuota', label: 'Saat batas kuota tercapai', type: 'textarea', req: 1, hint: 'Diblokir, peringatan, atau tawaran upgrade.' },
    { id: 'invoice', label: 'Invoice / bukti bayar', type: 'textarea' }
  ] });
  insertAfter('admin', { id: 'operasional', nama: 'Operasional & Pemantauan', desc: 'Log aktivitas, pemantauan server, dan penanganan gangguan.', fields: [
    { id: 'log', label: 'Log aktivitas (apa yang dicatat)', type: 'textarea', req: 1 },
    { id: 'pantau', label: 'Cara tahu server bermasalah', type: 'textarea', req: 1 },
    { id: 'insiden', label: 'Cara mengabari pengguna saat gangguan', type: 'textarea', req: 1 },
    { id: 'status', label: 'Halaman status layanan', type: 'text' }
  ] });
  insertAfter('operasional', { id: 'dukungan', nama: 'Dukungan Pelanggan', desc: 'Kanal bantuan, FAQ, dan alur menangani keluhan.', fields: [
    { id: 'kanal', label: 'Kanal bantuan', type: 'list', req: 1, sub: [{ id: 'kanal', label: 'Kanal' }, { id: 'jam', label: 'Jam layanan' }] },
    { id: 'faq', label: 'Pertanyaan yang sering muncul (FAQ)', type: 'textarea' },
    { id: 'keluhan', label: 'Alur menangani keluhan', type: 'textarea', req: 1 },
    { id: 'respon', label: 'Target waktu respon', type: 'text' }
  ] });
  insertAfter('dukungan', { id: 'retensi', nama: 'Retensi & Churn', desc: 'Menjaga pengguna tetap berlangganan dan menangani yang berhenti.', fields: [
    { id: 'alasan', label: 'Cara mencatat alasan berhenti', type: 'textarea', req: 1 },
    { id: 'penawaran', label: 'Penawaran sebelum berhenti', type: 'textarea' },
    { id: 'ekspor', label: 'Data yang bisa dibawa saat keluar', type: 'textarea', req: 1 },
    { id: 'aktif', label: 'Menarik kembali pengguna yang berhenti', type: 'textarea' }
  ] });
  addFields('integrasi', [
    { id: 'notifikasi', label: 'Notifikasi ke pengguna', type: 'textarea', req: 1, hint: 'Kejadian apa, lewat apa (WA, email, push).' },
    { id: 'api', label: 'API / webhook untuk klien', type: 'textarea' },
    { id: 'domain', label: 'Domain sendiri untuk klien', type: 'textarea' }
  ]);
  addFields('keamanan', [
    { id: 'hakdata', label: 'Hak pengguna atas datanya', type: 'textarea', req: 1, hint: 'Melihat, mengekspor, menghapus data (UU PDP).' },
    { id: 'pemulihan', label: 'Rencana pemulihan saat data hilang', type: 'textarea' }
  ]);

  /* ---------- Mode Lanjutan: tidak dihitung kalau mode mati ---------- */
  function T(id, label, req, hint) { return { id: id, label: label, type: 'textarea', req: req ? 1 : 0, hint: hint }; }
  [
    { id: 'skala', nama: 'Skalabilitas & Biaya per Toko', desc: 'Kesiapan saat pengguna bertambah banyak.', fields: [T('target', 'Target beban', 1, 'Mis. 1.000 toko aktif, 50 ribu kunjungan/hari.'), T('batasTeknis', 'Batas teknis yang mungkin tercapai'), T('strategi', 'Strategi (cache, CDN, antrean)', 1), T('biayaPerToko', 'Biaya server per toko per bulan', 1, 'Supaya harga paket tidak rugi.')] },
    { id: 'rilis', nama: 'Rilis & Versi Kode', desc: 'Cara merilis pembaruan dengan aman.', fields: [T('lingkungan', 'Lingkungan uji coba vs produksi', 1), T('deploy', 'Cara deploy', 1), T('flag', 'Feature flag (nyalakan fitur bertahap)'), T('rollback', 'Cara rollback saat rilis bermasalah', 1), T('migrasi', 'Migrasi struktur data')] },
    { id: 'bencana', nama: 'Pemulihan Bencana', desc: 'Kalau server atau data rusak total.', fields: [T('rpo', 'Maksimal data yang boleh hilang', 1, 'Mis. data 24 jam terakhir.'), T('rto', 'Maksimal waktu layanan mati', 1), T('langkah', 'Langkah pemulihan', 1), T('latihan', 'Jadwal latihan pemulihan')] },
    { id: 'pengujian', nama: 'Pengujian', desc: 'Memastikan fitur tidak rusak saat diubah.', fields: [T('otomatis', 'Tes otomatis', 1), T('beban', 'Uji beban'), T('manual', 'Checklist sebelum rilis', 1)] },
    { id: 'offline', nama: 'Mode Offline & Sinkronisasi', desc: 'Tetap jalan tanpa internet.', fields: [T('data', 'Data yang tersedia offline', 1), T('bentrok', 'Cara mengatasi data bentrok', 1), T('antrean', 'Antrean sinkron saat online')] },
    { id: 'keamananPlus', nama: 'Keamanan Lanjutan', desc: 'Perlindungan dari serangan dan penipuan.', fields: [T('login2', 'Login 2 langkah', 1), T('rate', 'Pembatasan permintaan (anti-spam/bot)', 1), T('fraud', 'Deteksi penipuan'), T('enkripsi', 'Enkripsi data sensitif')] },
    { id: 'pajak', nama: 'Pajak & Aturan Data', desc: 'PPN, faktur, dan lama penyimpanan data.', fields: [T('ppn', 'PPN layanan digital', 1), T('faktur', 'Faktur'), T('simpan', 'Lama data disimpan', 1), T('hapus', 'Proses penghapusan data')] },
    { id: 'moderasi', nama: 'Moderasi & Penyalahgunaan', desc: 'Konten terlarang, akun palsu, laporan.', fields: [T('terlarang', 'Konten/aktivitas terlarang', 1), T('laporan', 'Alur laporan', 1), T('sanksi', 'Sanksi')] },
    { id: 'analitik', nama: 'Analitik Produk', desc: 'Memahami perilaku pengguna.', fields: [{ id: 'event', label: 'Event yang dilacak', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Event' }, { id: 'kapan', label: 'Kapan terjadi' }] }, T('funnel', 'Corong (funnel) daftar sampai bayar', 1), T('ab', 'Uji A/B')] },
    { id: 'ekonomi', nama: 'Ekonomi Unit', desc: 'Apakah bisnisnya untung per pelanggan.', fields: [T('mrr', 'Target MRR (pendapatan bulanan berulang)', 1), T('cac', 'Biaya mendapatkan 1 pelanggan (CAC)', 1), T('ltv', 'Nilai pelanggan seumur hidup (LTV)'), T('impas', 'Titik impas', 1)] },
    { id: 'afiliasi', nama: 'Afiliasi, Reseller & White-label', desc: 'Pihak lain ikut menjual platformmu.', fields: [T('skema', 'Skema komisi', 1), T('bayarKomisi', 'Cara membayar komisi'), T('whitelabel', 'White-label (merek mitra)')] },
    { id: 'apiPublik', nama: 'API Publik & Plugin', desc: 'Pengembang lain terhubung ke platformmu.', fields: [{ id: 'endpoint', label: 'Endpoint', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Endpoint' }, { id: 'fungsi', label: 'Fungsi' }] }, T('auth', 'Kunci API & autentikasi', 1), T('versi', 'Versi API'), T('batas', 'Batas pemakaian', 1)] },
    { id: 'aksesKustom', nama: 'Hak Akses Kustom', desc: 'Pemilik toko membuat peran sendiri.', fields: [{ id: 'izin', label: 'Daftar izin', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Izin' }, { id: 'ket', label: 'Keterangan' }] }, T('cara', 'Cara membuat peran kustom')] },
    { id: 'i18n', nama: 'Bahasa, Mata Uang & Zona Waktu', desc: 'Siap dipakai di luar satu negara.', fields: [T('bahasa', 'Bahasa', 1), T('uang', 'Mata uang'), T('zona', 'Zona waktu')] },
    { id: 'migrasiPesaing', nama: 'Migrasi dari Pesaing', desc: 'Memudahkan orang pindah ke platformmu.', fields: [{ id: 'sumber', label: 'Sumber data', type: 'list', req: 1, sub: [{ id: 'nama', label: 'Platform asal' }, { id: 'format', label: 'Format data' }] }, T('cara', 'Cara impor')] }
  ].forEach(function (m) { m.adv = 1; MODULES.push(m); });

  /* keterkaitan tambahan */
  DEPS.peran.push('tim');
  DEPS.bisnis.push('tagihan', 'retensi');
  DEPS.tagihan = ['bisnis', 'integrasi', 'halaman'];
  DEPS.tim = ['peran', 'data', 'keamanan'];
  DEPS.onboarding = ['alur', 'halaman'];
  DEPS.operasional = ['teknologi'];
  DEPS.skala = ['teknologi', 'bisnis'];
  DEPS.ekonomi = ['bisnis'];

  /* ---------- isi modul tambahan untuk setiap template ---------- */
  var L2 = ['langkah', 'tujuan'], KJ = ['kanal', 'jam'];
  var EXTRA = {
    katalog: {
      tim: { undang: 'Pemilik toko mengundang staf lewat link undangan; staf login dengan Google lalu masuk ke toko.', batas: 'Gratis: hanya pemilik. Pro: 2 staf. Bisnis: 10 staf.', cabut: 'Pemilik menghapus staf dari daftar, akses langsung hilang.', transfer: 'Pemilik meminta admin platform memindahkan kepemilikan toko.' },
      onboarding: { langkah: rows(L2, [['Daftar dengan Google', 'Masuk tanpa kata sandi'], ['Isi nama toko dan nomor WhatsApp', 'Toko siap menerima pesanan'], ['Tambah 3 produk pertama', 'Katalog tidak kosong'], ['Bagikan link toko', 'Pelanggan pertama datang']]), aha: 'Pesanan pertama masuk ke WhatsApp penjual.', sambutan: 'WA sambutan berisi link toko dan video cara menambah produk.', bantuan: 'Contoh produk otomatis yang bisa dihapus.' },
      tagihan: { perpanjangan: 'Manual lewat QRIS; pengingat WA 7, 3, dan 1 hari sebelum habis.', gagal: 'Masa tenggang 3 hari, lalu toko turun ke paket Gratis (data tidak dihapus).', ubah: 'Naik paket langsung aktif, sisa hari dihitung prorata. Turun paket berlaku di periode berikutnya.', kuota: 'Saat produk mencapai batas, tombol tambah produk dikunci dan muncul tawaran upgrade.', invoice: 'Invoice PDF dikirim setelah pembayaran berhasil.' },
      operasional: { log: 'Login, ubah produk, ubah paket, nonaktifkan toko.', pantau: 'Cek otomatis setiap 5 menit dan notifikasi ke Telegram admin.', insiden: 'Banner di dasbor dan pesan di saluran Telegram.', status: '' },
      dukungan: { kanal: rows(KJ, [['WhatsApp admin', '09.00-21.00'], ['Pusat bantuan (FAQ)', '24 jam']]), faq: 'Cara tambah produk, cara upgrade, cara ganti nomor WA.', keluhan: 'Keluhan dicatat, dibalas maksimal 1x24 jam, ditandai selesai.', respon: '1x24 jam' },
      retensi: { alasan: 'Saat berhenti langganan, pengguna memilih alasan dari daftar.', penawaran: 'Diskon 50% satu bulan atau turun ke paket lebih murah.', ekspor: 'Daftar produk bisa diunduh sebagai CSV.', aktif: 'Pesan WA setelah 30 hari berisi fitur baru.' },
      integrasi: { notifikasi: 'WA saat paket hampir habis dan pembayaran berhasil.', api: '', domain: 'Paket Bisnis: domain sendiri lewat Cloudflare.' },
      keamanan: { hakdata: 'Pemilik toko bisa mengekspor dan menghapus semua data tokonya.', pemulihan: 'Pulihkan dari ekspor database mingguan.' }
    },
    jasa: {
      tim: { undang: 'Versi pertama: satu akun mitra untuk satu orang. Moderator diundang oleh admin platform.', batas: 'Mitra: 1 orang.', cabut: 'Admin mencabut peran moderator dari panel admin.', transfer: '' },
      onboarding: { langkah: rows(L2, [['Daftar', 'Akun dibuat'], ['Kirim data verifikasi', 'Mitra terpercaya'], ['Buat layanan pertama', 'Bisa dipesan']]), aha: 'Mitra menerima pesanan pertama.', sambutan: 'WA sambutan berisi panduan membuat layanan yang menarik.', bantuan: 'Contoh deskripsi layanan.' },
      tagihan: { perpanjangan: 'Manual lewat QRIS; pengingat WA 3 hari sebelum habis.', gagal: 'Tanpa masa tenggang; mitra turun ke paket Gratis.', ubah: 'Naik paket langsung aktif; turun paket berlaku periode berikutnya.', kuota: 'Layanan melebihi batas otomatis dinonaktifkan sampai upgrade.', invoice: 'Bukti bayar di dasbor mitra.' },
      operasional: { log: 'Perubahan status pesanan, verifikasi, blokir pengguna.', pantau: 'Cek otomatis dan notifikasi ke Telegram admin.', insiden: 'Pengumuman di komunitas Telegram.', status: '' },
      dukungan: { kanal: rows(KJ, [['Telegram komunitas', '24 jam'], ['WhatsApp admin', '10.00-22.00']]), faq: 'Cara jadi mitra, cara melapor penipuan.', keluhan: 'Laporan masuk ke antrean moderator, diselesaikan maksimal 2 hari.', respon: '12 jam' },
      retensi: { alasan: 'Pilihan alasan saat mitra berhenti Pro.', penawaran: 'Push rank gratis 3 hari.', ekspor: 'Riwayat pesanan dan ulasan bisa diunduh.', aktif: 'Promo mitra lama di event game besar.' },
      integrasi: { notifikasi: 'WA saat ada pesanan baru dan status pesanan berubah.', api: '', domain: '' },
      keamanan: { hakdata: 'Pengguna bisa meminta ekspor dan penghapusan akun.', pemulihan: 'Pulihkan dari ekspor database mingguan.' }
    },
    cafe: {
      tim: { undang: 'Pemilik mengundang kasir dan dapur dengan kode undangan 6 digit.', batas: 'Starter: 1 kasir. Pro: 5 karyawan. Multi cabang: 25 karyawan.', cabut: 'Pemilik menonaktifkan karyawan; sesi login di perangkat langsung keluar.', transfer: 'Pindah kepemilikan lewat admin platform.' },
      onboarding: { langkah: rows(L2, [['Isi profil cafe', 'Identitas cafe'], ['Impor atau tambah menu', 'Siap transaksi'], ['Undang kasir', 'Tim bisa bekerja'], ['Cetak QR meja', 'Pesan dari meja aktif']]), aha: 'Transaksi pertama tercatat dan muncul di laporan.', sambutan: 'WA sambutan berisi video cara memakai kasir.', bantuan: 'Menu contoh yang bisa diubah.' },
      tagihan: { perpanjangan: 'Manual lewat QRIS; pengingat 7 dan 1 hari sebelum habis.', gagal: 'Masa tenggang 5 hari, lalu turun ke Starter; kasir tetap bisa transaksi.', ubah: 'Prorata untuk naik paket; turun paket di periode berikutnya.', kuota: 'Karyawan melebihi batas tidak bisa login sampai upgrade.', invoice: 'Invoice PDF setiap pembayaran.' },
      operasional: { log: 'Transaksi dibatalkan, diskon, perubahan harga menu, login karyawan.', pantau: 'Cek otomatis dan notifikasi ke Telegram admin.', insiden: 'Banner di aplikasi; kasir tetap jalan offline.', status: '' },
      dukungan: { kanal: rows(KJ, [['WhatsApp admin', '08.00-22.00'], ['Video panduan', '24 jam']]), faq: 'Cara cetak struk, cara tambah karyawan.', keluhan: 'Keluhan saat jam buka cafe diprioritaskan.', respon: '2 jam saat jam operasional' },
      retensi: { alasan: 'Pilihan alasan saat berhenti.', penawaran: 'Gratis 1 bulan atau turun paket.', ekspor: 'Laporan penjualan dan menu bisa diunduh CSV.', aktif: 'Tawaran kembali dengan diskon.' },
      integrasi: { notifikasi: 'WA ringkasan penjualan harian ke pemilik.', api: 'Nanti: webhook transaksi untuk aplikasi akuntansi.', domain: '' },
      keamanan: { hakdata: 'Pemilik bisa mengekspor dan menghapus data cafe.', pemulihan: 'Pulihkan dari ekspor harian.' }
    },
    retur: {
      tim: { undang: 'Pemilik mengundang staf gudang lewat email.', batas: 'Gratis: 1 staf. Pro: 5 staf. Bisnis: tak terbatas.', cabut: 'Pemilik menghapus staf, akses langsung hilang.', transfer: '' },
      onboarding: { langkah: rows(L2, [['Buat toko', 'Akun siap'], ['Atur kebijakan retur', 'Aturan jelas'], ['Bagikan link retur', 'Pembeli bisa mengajukan']]), aha: 'Retur pertama selesai diproses dengan rapi.', sambutan: 'Email sambutan dengan contoh kebijakan retur.', bantuan: 'Templat kebijakan retur siap pakai.' },
      tagihan: { perpanjangan: 'Manual lewat QRIS; pengingat 3 hari sebelum habis.', gagal: 'Masa tenggang 3 hari, lalu turun ke Gratis.', ubah: 'Naik paket langsung aktif; turun paket periode berikutnya.', kuota: 'Retur ke-31 di paket Gratis tetap diterima tapi terkunci sampai upgrade.', invoice: 'Invoice PDF.' },
      operasional: { log: 'Perubahan status retur dan siapa yang mengubah.', pantau: 'Cek otomatis dan notifikasi ke Telegram admin.', insiden: 'Banner di dasbor.', status: '' },
      dukungan: { kanal: rows(KJ, [['WhatsApp admin', '09.00-21.00']]), faq: 'Cara atur batas hari retur.', keluhan: 'Dicatat dan dibalas maksimal 1x24 jam.', respon: '1x24 jam' },
      retensi: { alasan: 'Pilihan alasan saat berhenti.', penawaran: 'Diskon satu bulan.', ekspor: 'Data retur bisa diunduh CSV.', aktif: '' },
      integrasi: { notifikasi: 'WA ke pembeli saat status retur berubah.', api: '', domain: '' },
      keamanan: { hakdata: 'Pembeli bisa meminta penghapusan data returnya.', pemulihan: 'Pulihkan dari ekspor mingguan.' }
    }
  };
  TEMPLATES.forEach(function (t) {
    var ex = EXTRA[t.id];
    if (!ex) return;
    Object.keys(ex).forEach(function (mid) { t.data[mid] = Object.assign({}, t.data[mid] || {}, ex[mid]); });
  });

  window.BS = { MODULES: MODULES, DEPS: DEPS, TEMPLATES: TEMPLATES };
})();
