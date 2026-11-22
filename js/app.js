/* Blueprint Studio — logika aplikasi */
(function () {
  var MODULES = BS.MODULES, DEPS = BS.DEPS, TEMPLATES = BS.TEMPLATES;
  var st = { view: 'home', pid: null, tab: 'modul', mid: null, home: 'rancangan', q: '', kq: '' };
  var projects = [], tpls = [], savedP = {}, savedT = {};
  var app = document.getElementById('app');
  var saveTimer = null, pendingRender = false;

  /* ---------- penyimpanan: database HP + sinkron cloud ---------- */
  function storeErr(e) { toast('Gagal menyimpan ke database: ' + ((e && e.message) || e)); }
  function flush() {
    var ids = {}, tids = {};
    projects.forEach(function (p) {
      ids[p.id] = 1;
      if (savedP[p.id] !== p.diubah) { savedP[p.id] = p.diubah; Store.putProject(p).catch(storeErr); Sync.changed('p', p.id); }
    });
    Object.keys(savedP).forEach(function (id) { if (!ids[id]) { delete savedP[id]; Store.delProject(id).catch(storeErr); Sync.deleted('p', id); } });
    tpls.forEach(function (t) {
      tids[t.id] = 1;
      if (savedT[t.id] !== t.diubah) { savedT[t.id] = t.diubah; Store.putTemplate(t).catch(storeErr); Sync.changed('t', t.id); }
    });
    Object.keys(savedT).forEach(function (id) { if (!tids[id]) { delete savedT[id]; Store.delTemplate(id).catch(storeErr); Sync.deleted('t', id); } });
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 300); }
  function saveNow() { clearTimeout(saveTimer); flush(); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function newProject(nama, tid) {
    var t = allTemplates().filter(function (x) { return x.id === tid; })[0] || TEMPLATES[0];
    return fixProject({ id: uid(), nama: nama || t.nama, template: t.id, dibuat: Date.now(), diubah: Date.now(), data: clone(t.data), cek: {}, versi: [], lanjut: !!t.lanjut });
  }
  function mods(p) { return MODULES.filter(function (m) { return !m.adv || (p && p.lanjut); }); }
  function numOf(m) {
    var core = MODULES.filter(function (x) { return !x.adv; }), adv = MODULES.filter(function (x) { return x.adv; });
    return m.adv ? 'L' + (adv.indexOf(m) + 1) : String(core.indexOf(m) + 1);
  }
  function cur() { return projects.filter(function (p) { return p.id === st.pid; })[0]; }
  function modDef(id) { return MODULES.filter(function (m) { return m.id === id; })[0]; }
  function get(p, mid, fid) {
    var m = p.data[mid] || {};
    var f = modDef(mid).fields.filter(function (x) { return x.id === fid; })[0];
    var v = m[fid];
    if (v === undefined) v = f.type === 'list' ? [] : '';
    return v;
  }
  function setv(p, mid, fid, v) {
    if (!p.data[mid]) p.data[mid] = {};
    p.data[mid][fid] = v;
  }

  /* ---------- skor kelengkapan ---------- */
  function filled(f, v) {
    if (f.type === 'list') {
      return (v || []).some(function (it) {
        return Object.keys(it).some(function (k) { return k !== 'prioritas' && k !== '_id' && String(it[k] || '').trim(); });
      });
    }
    return String(v || '').trim() !== '';
  }
  function modScore(p, m) {
    var req = m.fields.filter(function (f) { return f.req; });
    var done = req.filter(function (f) { return filled(f, get(p, m.id, f.id)); }).length;
    return { done: done, total: req.length, pct: req.length ? Math.round(done / req.length * 100) : 100 };
  }
  function totalScore(p) {
    var s = 0, list = mods(p);
    list.forEach(function (m) { s += modScore(p, m).pct; });
    return Math.round(s / list.length);
  }

  /* ---------- pendeteksi celah ---------- */
  function low(s) { return String(s || '').toLowerCase().trim(); }
  function splitRoles(s) { return String(s || '').split(/[,;\/]| dan /).map(low).filter(Boolean); }
  function celah(p) {
    var out = [];
    function add(lv, mid, pesan) { out.push({ lv: lv, mid: mid, pesan: pesan }); }
    var roles = get(p, 'peran', 'daftar').map(function (r) { return low(r.nama); }).filter(Boolean);
    var fitur = get(p, 'fitur', 'daftar').filter(function (f) { return low(f.nama); });
    var alur = get(p, 'alur', 'daftar').filter(function (a) { return low(a.judul) || low(a.peran); });
    var hal = get(p, 'halaman', 'daftar').filter(function (h) { return low(h.nama); });
    var ent = get(p, 'data', 'daftar').filter(function (d) { return low(d.nama); });
    var paket = get(p, 'bisnis', 'paket').filter(function (x) { return low(x.nama); });
    var integ = get(p, 'integrasi', 'daftar').filter(function (x) { return low(x.nama); });
    var hasRole = function (n) { return roles.indexOf(n) > -1; };
    var allText = JSON.stringify(p.data, function (k, v) { return k === '_id' ? undefined : v; }).toLowerCase();

    if (roles.length < 2) add('kuning', 'peran', 'Biasanya SaaS punya minimal 2 peran (mis. pemilik toko dan pelanggan), ditambah admin platform.');
    if (roles.length && !roles.some(function (r) { return /admin/.test(r); })) add('kuning', 'peran', 'Belum ada peran Admin platform (kamu sebagai pengelola SaaS-nya).');
    roles.forEach(function (r) {
      var nm = get(p, 'peran', 'daftar').filter(function (x) { return low(x.nama) === r; })[0].nama;
      if (!alur.some(function (a) { return splitRoles(a.peran).indexOf(r) > -1; })) add('merah', 'alur', 'Peran "' + nm + '" belum punya alur pengguna.');
      if (!hal.some(function (h) { return splitRoles(h.peran).indexOf(r) > -1; })) add('kuning', 'halaman', 'Peran "' + nm + '" belum punya halaman.');
      if (fitur.length && !fitur.some(function (f) { return splitRoles(f.peran).indexOf(r) > -1; })) add('kuning', 'fitur', 'Peran "' + nm + '" belum punya fitur.');
    });
    fitur.forEach(function (f) {
      splitRoles(f.peran).forEach(function (r) { if (roles.length && !hasRole(r)) add('merah', 'fitur', 'Fitur "' + f.nama + '" memakai peran "' + r + '" yang tidak ada di modul Peran.'); });
    });
    alur.forEach(function (a) {
      splitRoles(a.peran).forEach(function (r) { if (roles.length && !hasRole(r)) add('kuning', 'alur', 'Alur "' + (a.judul || '-') + '" memakai peran "' + r + '" yang tidak ada di modul Peran.'); });
      if (!String(a.langkah || '').trim()) add('kuning', 'alur', 'Alur "' + (a.judul || '-') + '" belum punya langkah.');
    });
    hal.forEach(function (h) {
      splitRoles(h.peran).forEach(function (r) { if (roles.length && !hasRole(r)) add('kuning', 'halaman', 'Halaman "' + h.nama + '" untuk peran "' + r + '" yang tidak ada di modul Peran.'); });
    });
    var mvp = fitur.filter(function (f) { return (f.prioritas || 'MVP') === 'MVP'; }).length;
    if (fitur.length && !mvp) add('merah', 'fitur', 'Belum ada fitur yang ditandai MVP.');
    if (mvp > 15) add('kuning', 'fitur', 'Fitur MVP terlalu banyak (' + mvp + '). Versi pertama sebaiknya ramping, pindahkan sebagian ke "Nanti".');

    if (!paket.length) add('merah', 'bisnis', 'Belum ada paket langganan.');
    paket.forEach(function (x) { if (!String(x.batas || '').trim()) add('kuning', 'bisnis', 'Paket "' + x.nama + '" belum punya batas kuota.'); });
    var gratis = paket.some(function (x) { return Number(x.harga || 0) === 0; });
    if (paket.length && !gratis && !String(get(p, 'bisnis', 'trial')).trim()) add('kuning', 'bisnis', 'Belum ada paket gratis atau masa uji coba untuk menarik pengguna awal.');
    var berbayar = paket.some(function (x) { return Number(x.harga || 0) > 0; });
    var payRe = /bayar|payment|midtrans|xendit|qris|tripay|duitku|transfer/;
    if (berbayar && !integ.some(function (x) { return payRe.test(low(x.nama + ' ' + x.tujuan)); })) add('merah', 'integrasi', 'Ada paket berbayar, tapi belum ada integrasi pembayaran.');
    var mitraRe = /penjual|seller|mitra|vendor|joki|penyedia/;
    if (roles.some(function (r) { return mitraRe.test(r); }) && !/cair|penarikan|payout|withdraw|komisi|bagi hasil|langsung ke penjual|whatsapp/.test(allText))
      add('kuning', 'alur', 'Ada peran penjual/mitra, tapi belum jelas bagaimana mereka menerima uang (pencairan, komisi, atau bayar langsung).');

    var model = get(p, 'tenant', 'model');
    if (model && !/^Satu/.test(model) && ent.length && !ent.some(function (d) { return /toko|tenant|store|usaha|cafe|bisnis|klien/.test(low(d.isian)); }))
      add('merah', 'data', 'Entitas data belum punya penanda toko (mis. tokoId) untuk memisahkan data antar-toko.');
    if (fitur.some(function (f) { return /pesan|order/.test(low(f.nama)); }) && ent.length && !ent.some(function (d) { return /pesan|order|transaksi/.test(low(d.nama)); }))
      add('kuning', 'data', 'Ada fitur pesanan, tapi belum ada entitas Pesanan di struktur data.');
    if (ent.length && !String(get(p, 'keamanan', 'rules')).trim()) add('merah', 'keamanan', 'Struktur data sudah ada, tapi aturan akses data (rules) belum ditulis.');
    if (hal.length && !hal.some(function (h) { return /login|masuk|daftar/.test(low(h.nama)); })) add('kuning', 'halaman', 'Belum ada halaman Login/Daftar.');
    if (!get(p, 'admin', 'metrik').some(function (x) { return low(x.nama); })) add('kuning', 'admin', 'Belum ada metrik yang dipantau, jadi sulit tahu platform berkembang atau tidak.');
    if (!String(get(p, 'teknologi', 'biaya')).trim()) add('kuning', 'teknologi', 'Perkiraan biaya server belum diisi.');
    if (!get(p, 'peluncuran', 'fase').some(function (x) { return low(x.fase); })) add('kuning', 'peluncuran', 'Tahapan peluncuran belum diisi.');

    /* aturan modul SaaS tambahan */
    function tx(mid, fid) { return String(get(p, mid, fid) || '').trim(); }
    var stafRe = /kasir|staf|karyawan|dapur|gudang|pegawai/;
    var adaStaf = roles.some(function (r) { return stafRe.test(r); });
    if (adaStaf && !tx('tim', 'undang')) add('merah', 'tim', 'Ada peran staf/karyawan, tapi belum ada cara mengundang mereka ke dalam akun.');
    if (adaStaf && ent.length && !ent.some(function (d) { return /staf|karyawan|anggota|tim|pegawai/.test(low(d.nama)); })) add('kuning', 'data', 'Ada peran staf, tapi belum ada entitas data untuk anggota tim.');
    if (berbayar && !tx('tagihan', 'gagal')) add('merah', 'tagihan', 'Ada paket berbayar, tapi belum ada aturan saat pembayaran gagal atau telat.');
    if (berbayar && !tx('tagihan', 'perpanjangan')) add('kuning', 'tagihan', 'Cara perpanjangan langganan belum ditentukan.');
    if (paket.some(function (x) { return String(x.batas || '').trim(); }) && !tx('tagihan', 'kuota')) add('merah', 'tagihan', 'Paket punya batas kuota, tapi belum ditentukan apa yang terjadi saat batas tercapai.');
    if (paket.length > 1 && !tx('tagihan', 'ubah')) add('kuning', 'tagihan', 'Ada beberapa paket, tapi aturan naik/turun paket belum ditulis.');
    if (!tx('onboarding', 'aha')) add('kuning', 'onboarding', 'Momen "aha" belum ditentukan, jadi sulit mengukur apakah pengguna baru berhasil.');
    if (roles.length > 2 && !tx('operasional', 'log')) add('kuning', 'operasional', 'Belum ada log aktivitas; sulit menyelesaikan sengketa "siapa mengubah apa".');
    if (!tx('operasional', 'pantau')) add('kuning', 'operasional', 'Belum ada cara mengetahui server bermasalah.');
    if (!get(p, 'dukungan', 'kanal').some(function (x) { return low(x.kanal); })) add('kuning', 'dukungan', 'Belum ada kanal bantuan untuk pengguna.');
    if (berbayar && !tx('retensi', 'alasan')) add('kuning', 'retensi', 'Alasan pengguna berhenti belum dicatat, padahal ini bahan perbaikan utama.');
    if (!tx('retensi', 'ekspor')) add('kuning', 'retensi', 'Belum ditentukan data apa yang bisa dibawa pengguna saat berhenti.');
    if (!tx('integrasi', 'notifikasi')) add('kuning', 'integrasi', 'Notifikasi ke pengguna belum direncanakan.');
    if (ent.length && !tx('keamanan', 'hakdata')) add('kuning', 'keamanan', 'Hak pengguna atas datanya (lihat, ekspor, hapus) belum ditulis.');

    /* aturan Mode Lanjutan */
    if (p.lanjut) {
      var sudah = {};
      if (/\b(kasir|pos|point of sale|cafe|kafe|resto|restoran|restaurant)\b/.test(allText) && !modScore(p, modDef('offline')).done) { add('merah', 'offline', 'Ini aplikasi kasir/cafe, tapi mode offline belum dirancang. Transaksi bisa berhenti saat internet mati.'); sudah.offline = 1; }
      if (tx('integrasi', 'api') && !modScore(p, modDef('apiPublik')).done) { add('kuning', 'apiPublik', 'Kamu merencanakan API untuk klien, tapi modul API Publik belum diisi.'); sudah.apiPublik = 1; }
      if (berbayar && !modScore(p, modDef('ekonomi')).done) { add('kuning', 'ekonomi', 'Ada paket berbayar, tapi ekonomi unit belum dihitung, jadi belum jelas untung atau rugi per pelanggan.'); sudah.ekonomi = 1; }
      MODULES.filter(function (m) { return m.adv && !sudah[m.id]; }).forEach(function (m) {
        if (!modScore(p, m).done) add('kuning', m.id, 'Modul lanjutan "' + m.nama + '" belum diisi.');
      });
    }
    return out;
  }

  /* ---------- ekspor ---------- */
  function mdVal(f, v) {
    if (f.type === 'list') {
      var items = (v || []).filter(function (it) { return Object.keys(it).some(function (k) { return k !== '_id' && String(it[k] || '').trim(); }); });
      if (!items.length) return '_(belum diisi)_\n';
      return items.map(function (it, i) {
        if (f.sub.length === 1) return '- ' + it[f.sub[0].id];
        var head = it[f.sub[0].id] || ('Item ' + (i + 1));
        var rest = f.sub.slice(1).map(function (s) {
          var val = String(it[s.id] || '').trim();
          if (!val) return '';
          if (s.type === 'number' && val) val = 'Rp' + Number(val).toLocaleString('id-ID');
          if (val.indexOf('\n') > -1) return '  - ' + s.label + ':\n' + val.split('\n').map(function (l) { return '    - ' + l; }).join('\n');
          return '  - ' + s.label + ': ' + val;
        }).filter(Boolean).join('\n');
        return '- **' + head + '**' + (rest ? '\n' + rest : '');
      }).join('\n') + '\n';
    }
    return (String(v || '').trim() || '_(belum diisi)_') + '\n';
  }
  function toMarkdown(p) {
    var s = '# Rancangan SaaS: ' + p.nama + '\n\nKelengkapan: ' + totalScore(p) + '%\n\n';
    mods(p).forEach(function (m) {
      s += '## ' + numOf(m) + '. ' + m.nama + (m.adv ? ' (Lanjutan)' : '') + '\n\n';
      m.fields.forEach(function (f) { s += '### ' + f.label + '\n' + mdVal(f, get(p, m.id, f.id)) + '\n'; });
    });
    var c = celah(p);
    if (c.length) s += '## Celah yang masih terbuka\n' + c.map(function (x) { return '- ' + x.pesan; }).join('\n') + '\n';
    return s;
  }
  function toPrompt(p) {
    return 'Bangun prototipe platform SaaS berdasarkan rancangan di bawah.\n\n' +
      'Ketentuan:\n- Kerjakan fitur berprioritas MVP saja; fitur "Nanti" cukup disiapkan tempatnya.\n' +
      '- Ikuti peran, alur pengguna, struktur data, halaman, dan paket langganan persis seperti rancangan.\n' +
      '- Tampilan berbahasa Indonesia dan nyaman dipakai di HP Android.\n' +
      '- File dipisah: index.html, css/style.css, js/app.js, assets/, lengkap dengan pengaturan deploy.\n' +
      '- Biarkan kosong semua isian kredensial/konfigurasi (mis. FIREBASE_CONFIG), aku isi sendiri.\n' +
      '- Sertakan aturan keamanan database sesuai modul Keamanan.\n\n---\n\n' + toMarkdown(p);
  }

  /* ---------- VERSI RANCANGAN ---------- */
  function ensureIds(data) {
    var LISTS = [];
    MODULES.forEach(function (m) { m.fields.forEach(function (f) { if (f.type === 'list') LISTS.push([m.id, f.id]); }); });
    LISTS.forEach(function (k) {
      var l = data && data[k[0]] && data[k[0]][k[1]];
      if (Array.isArray(l)) l.forEach(function (it) { if (it && !it._id) it._id = uid(); });
    });
    return data;
  }
  function fixProject(p) {
    p.data = ensureIds(p.data || {});
    if (!Array.isArray(p.versi)) p.versi = [];
    p.versi.forEach(function (v) { if (!v.id) v.id = uid(); });
    if (!p.cek) p.cek = {};
    return p;
  }
  function lastVer(p) { return p.versi && p.versi.length ? p.versi[p.versi.length - 1] : null; }
  function tr(v) { return String(v == null ? '' : v).trim(); }
  function getIn(data, mid, f) {
    var v = data && data[mid] ? data[mid][f.id] : undefined;
    return v === undefined ? (f.type === 'list' ? [] : '') : v;
  }
  function itemTitle(f, it) { return tr(it[f.sub[0].id]) || '(tanpa nama)'; }
  function itemEmpty(it) { return !Object.keys(it).some(function (k) { return k !== '_id' && k !== 'prioritas' && tr(it[k]); }); }

  /* bandingkan dua isi rancangan; hasil: daftar modul yang berubah */
  function diffData(a, b) {
    var out = [];
    MODULES.forEach(function (m) {
      var fields = [];
      m.fields.forEach(function (f) {
        var va = getIn(a, m.id, f), vb = getIn(b, m.id, f);
        if (f.type === 'list') {
          var la = va.filter(function (x) { return !itemEmpty(x); }), lb = vb.filter(function (x) { return !itemEmpty(x); });
          var ma = {}, mb = {};
          la.forEach(function (x) { ma[x._id] = x; }); lb.forEach(function (x) { mb[x._id] = x; });
          var added = lb.filter(function (x) { return !ma[x._id]; });
          var removed = la.filter(function (x) { return !mb[x._id]; });
          var changed = [];
          lb.forEach(function (x) {
            var o = ma[x._id]; if (!o) return;
            var d = f.sub.filter(function (s) { return tr(o[s.id]) !== tr(x[s.id]); }).map(function (s) { return { label: s.label, from: tr(o[s.id]), to: tr(x[s.id]), id: s.id }; });
            if (d.length) changed.push({ item: x, old: o, diffs: d });
          });
          if (added.length || removed.length || changed.length) fields.push({ f: f, list: 1, added: added, removed: removed, changed: changed });
        } else if (tr(va) !== tr(vb)) fields.push({ f: f, from: tr(va), to: tr(vb) });
      });
      if (fields.length) out.push({ m: m, fields: fields });
    });
    return out;
  }
  function countDiff(d) {
    var n = { tambah: 0, ubah: 0, hapus: 0 };
    d.forEach(function (md) { md.fields.forEach(function (x) {
      if (x.list) { n.tambah += x.added.length; n.ubah += x.changed.length; n.hapus += x.removed.length; } else n.ubah++;
    }); });
    return n;
  }
  function short(s) { s = tr(s).replace(/\s+/g, ' '); return s.length > 60 ? s.slice(0, 57) + '…' : (s || '(kosong)'); }
  function changelog(d, judul) {
    var tambah = [], ubah = [], hapus = [];
    d.forEach(function (md) {
      md.fields.forEach(function (x) {
        var lbl = md.m.nama + ' › ' + x.f.label;
        if (x.list) {
          x.added.forEach(function (it) { tambah.push(lbl + ': ' + itemTitle(x.f, it)); });
          x.removed.forEach(function (it) { hapus.push(lbl + ': ' + itemTitle(x.f, it)); });
          x.changed.forEach(function (c) {
            ubah.push(lbl + ': ' + itemTitle(x.f, c.item) + ' (' + c.diffs.map(function (z) { return z.label + ': ' + short(z.from) + ' → ' + short(z.to); }).join('; ') + ')');
          });
        } else if (!x.from) tambah.push(lbl + ': ' + short(x.to));
        else if (!x.to) hapus.push(lbl);
        else ubah.push(lbl + ': ' + short(x.from) + ' → ' + short(x.to));
      });
    });
    var s = '## ' + judul + '\n\n';
    if (!tambah.length && !ubah.length && !hapus.length) return s + 'Tidak ada perubahan.\n';
    if (tambah.length) s += '### Ditambahkan\n' + tambah.map(function (x) { return '- ' + x; }).join('\n') + '\n\n';
    if (ubah.length) s += '### Diubah\n' + ubah.map(function (x) { return '- ' + x; }).join('\n') + '\n\n';
    if (hapus.length) s += '### Dihapus\n' + hapus.map(function (x) { return '- ' + x; }).join('\n') + '\n\n';
    return s;
  }
  /* pemeriksa dampak perubahan */
  function dampak(d) {
    var out = [];
    function add(lv, pesan) { out.push({ lv: lv, pesan: pesan }); }
    function fd(mid, fid) {
      var md = d.filter(function (x) { return x.m.id === mid; })[0];
      return md ? md.fields.filter(function (x) { return x.f.id === fid; })[0] : null;
    }
    var x;
    if ((x = fd('data', 'daftar'))) {
      var nm = x.removed.concat(x.changed.filter(function (c) { return c.diffs.some(function (z) { return z.id !== 'relasi'; }); }).map(function (c) { return c.item; }))
        .map(function (it) { return itemTitle(x.f, it); });
      if (nm.length) add('merah', 'Struktur data berubah (' + nm.join(', ') + '). Siapkan migrasi agar data pengguna lama tidak rusak atau hilang.');
    }
    if ((x = fd('tenant', 'model'))) add('merah', 'Model pemisahan data antar-toko berubah. Ini perubahan besar: semua toko lama perlu dimigrasi.');
    if ((x = fd('teknologi', 'database'))) add('merah', 'Database diganti. Siapkan pemindahan seluruh data lama.');
    if ((x = fd('peran', 'daftar'))) x.removed.forEach(function (it) { add('merah', 'Peran "' + itemTitle(x.f, it) + '" dihapus. Tentukan nasib pengguna lama yang memakai peran ini.'); });
    if ((x = fd('bisnis', 'paket'))) {
      x.removed.forEach(function (it) { add('merah', 'Paket "' + itemTitle(x.f, it) + '" dihapus. Pindahkan pelanggan lama ke paket lain dan kabari mereka.'); });
      x.changed.forEach(function (c) {
        c.diffs.forEach(function (z) {
          if (z.id === 'harga') add('kuning', 'Harga paket "' + itemTitle(x.f, c.item) + '" berubah (' + short(z.from) + ' → ' + short(z.to) + '). Tentukan apakah pelanggan lama tetap memakai harga lama.');
          if (z.id === 'batas') add('kuning', 'Batas paket "' + itemTitle(x.f, c.item) + '" berubah. Cek pelanggan lama yang sudah melebihi batas baru.');
        });
      });
    }
    if ((x = fd('fitur', 'daftar'))) x.removed.forEach(function (it) { add('kuning', 'Fitur "' + itemTitle(x.f, it) + '" dihapus. Kabari pengguna dan siapkan penggantinya.'); });
    if ((x = fd('halaman', 'daftar'))) x.removed.forEach(function (it) { add('kuning', 'Halaman "' + itemTitle(x.f, it) + '" dihapus. Arahkan link lama ke halaman lain.'); });
    if (fd('keamanan', 'rules')) add('kuning', 'Aturan akses data berubah. Uji ulang rules sebelum rilis.');
    if (fd('tagihan', 'gagal') || fd('tagihan', 'perpanjangan') || fd('tagihan', 'kuota')) add('kuning', 'Aturan tagihan berubah. Umumkan ke pelanggan sebelum berlaku.');
    d.forEach(function (md) {
      var deps = (DEPS[md.m.id] || []).filter(function (id) { return !d.some(function (o) { return o.m.id === id; }); });
      if (deps.length) add('info', md.m.nama + ' berubah. Periksa juga: ' + deps.map(function (id) { return modDef(id).nama; }).join(', ') + '.');
    });
    return out;
  }
  function verLabel(v) { return v ? 'v' + v.no : 'draf'; }
  function nextNo(p) {
    var v = lastVer(p); if (!v) return '1.0';
    var parts = String(v.no).split('.').map(function (n) { return parseInt(n, 10) || 0; });
    while (parts.length < 2) parts.push(0);
    parts[1]++; if (parts.length > 2) parts[2] = 0;
    return parts.slice(0, 2).join('.');
  }
  function sectionMd(p, mids) {
    return mods(p).filter(function (m) { return mids.indexOf(m.id) > -1; }).map(function (m) {
      return '## ' + m.nama + '\n\n' + m.fields.map(function (f) { return '### ' + f.label + '\n' + mdVal(f, get(p, m.id, f.id)); }).join('\n');
    }).join('\n');
  }
  function updatePrompt(p, fromVer, toData, toLabel) {
    var d = diffData(fromVer.data, toData);
    var pp = { nama: p.nama, data: toData, lanjut: p.lanjut };
    var dm = dampak(d);
    return 'Aplikasi SaaS "' + p.nama + '" sudah berjalan di ' + verLabel(fromVer) + '. Terapkan pembaruan ke ' + toLabel + ' pada kode yang sudah ada.\n\n' +
      'Ketentuan:\n- Jangan membangun ulang dari nol; ubah hanya bagian yang terdampak.\n' +
      '- Untuk setiap perubahan struktur data, sertakan langkah/skrip migrasi agar data pengguna lama tidak hilang.\n' +
      '- Perbarui aturan keamanan database bila terdampak.\n' +
      '- Kirim kode sumber utuh (index.html, css/style.css, js/app.js, assets/, pengaturan deploy).\n' +
      '- Biarkan kosong semua isian kredensial/konfigurasi.\n- Tampilan berbahasa Indonesia.\n\n' +
      '# Perubahan\n\n' + changelog(d, verLabel(fromVer) + ' → ' + toLabel) +
      (dm.length ? '# Dampak yang harus ditangani\n\n' + dm.map(function (x) { return '- ' + x.pesan; }).join('\n') + '\n\n' : '') +
      '# Isi lengkap modul yang berubah (' + toLabel + ')\n\n' + sectionMd(pp, d.map(function (x) { return x.m.id; }));
  }
  function verProject(p, v) { return { nama: p.nama + ' ' + verLabel(v), data: v.data, lanjut: v.lanjut, cek: {} }; }

  /* ---------- utilitas tampilan ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tgl(t) { try { return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function copy(text, label) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? label + ' disalin' : 'Gagal menyalin. Tekan lama teks di pratinjau untuk menyalin manual.');
    }
    try {
      navigator.clipboard.writeText(text).then(function () { toast(label + ' disalin'); }, fallback);
    } catch (e) { fallback(); }
  }
  function download(name, text, type) {
    try {
      var b = new Blob([text], { type: type });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      toast('Mengunduh ' + name + '. Kalau tidak jalan, pakai tombol Salin.');
    } catch (e) { toast('Unduhan tidak didukung di sini. Pakai tombol Salin.'); }
  }
  function slug(s) { return low(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rancangan'; }
  function bar(pct) { return '<div class="bar"><i style="width:' + pct + '%"></i></div>'; }
  function scoreCls(pct) { return pct >= 100 ? 'ok' : pct >= 50 ? 'mid' : 'lo'; }

  /* ---------- modal ---------- */
  function modal(html) {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    m.classList.add('on');
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('on'); m.innerHTML = ''; }

  /* ---------- render ---------- */
  function render() {
    var p = cur();
    if (st.view !== 'home' && !p) st.view = 'home';
    var back = document.getElementById('back'), ttl = document.getElementById('ttl');
    back.hidden = st.view === 'home';
    if (st.view === 'home') { ttl.textContent = 'Blueprint Studio'; app.innerHTML = renderHome(); if (st.home === 'akun') showQuota(); }
    else if (st.view === 'proyek') { ttl.textContent = p.nama; app.innerHTML = renderProject(p); }
    else { ttl.textContent = modDef(st.mid).nama; app.innerHTML = renderModule(p, modDef(st.mid)); }
    renderNav(); syncChip(); pendingRender = false;
    window.scrollTo(0, 0);
  }
  /* render ulang saat data datang dari cloud, tanpa mengganggu yang sedang mengetik */
  function softRender() {
    var a = document.activeElement;
    if (a && app.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { pendingRender = true; return; }
    if (document.getElementById('modal').classList.contains('on')) { pendingRender = true; return; }
    var y = window.scrollY; render(); window.scrollTo(0, y);
  }

  /* ================= BERANDA: Rancangan, Cari, Belajar, Kamus, Akun ================= */
  var NAV = [['rancangan', 'Rancangan'], ['cari', 'Cari'], ['belajar', 'Belajar'], ['kamus', 'Kamus'], ['akun', 'Akun']];
  function renderNav() {
    var n = document.getElementById('nav');
    if (st.view !== 'home') { n.hidden = true; document.body.classList.remove('withnav'); return; }
    n.hidden = false; document.body.classList.add('withnav');
    n.innerHTML = NAV.map(function (x) {
      return '<button class="nv' + (st.home === x[0] ? ' on' : '') + '" data-act="home" data-h="' + x[0] + '">' + ICON[x[0]] + '<span>' + x[1] + '</span></button>';
    }).join('');
  }
  var ICON = {
    rancangan: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    cari: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>',
    belajar: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5"/></svg>',
    kamus: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
    akun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>'
  };
  function allTemplates() { return TEMPLATES.concat(tpls.filter(function (t) { return !t.dihapus; })); }

  function renderHome() {
    if (st.home === 'cari') return renderCari();
    if (st.home === 'belajar') return renderBelajar();
    if (st.home === 'kamus') return renderKamus();
    if (st.home === 'akun') return renderAkun();
    var list = projects.slice().sort(function (a, b) { return b.diubah - a.diubah; });
    var cards = list.map(function (p) {
      var sc = totalScore(p), c = celah(p), lv = lastVer(p);
      var merah = c.filter(function (x) { return x.lv === 'merah'; }).length;
      return '<article class="card proj" data-act="open" data-id="' + p.id + '">' +
        '<div class="row"><h3>' + esc(p.nama) + '</h3>' + (lv ? '<span class="tag teal">' + esc(verLabel(lv)) + '</span>' : '') + '<b class="pct ' + scoreCls(sc) + '">' + sc + '%</b></div>' + bar(sc) +
        '<p class="meta">' + c.length + ' celah' + (merah ? ' (' + merah + ' penting)' : '') + ' · diubah ' + tgl(p.diubah) + '</p>' +
        '<div class="acts"><button class="btn sm ghost" data-act="dup" data-id="' + p.id + '">Duplikat</button>' +
        '<button class="btn sm ghost danger" data-act="askdel" data-id="' + p.id + '">Hapus</button></div></article>';
    }).join('');
    var mine = tpls.filter(function (t) { return !t.dihapus; }).map(function (t) {
      return '<div class="card"><div class="row"><h3>' + esc(t.nama) + '</h3><button class="btn sm ghost danger" data-act="askdeltpl" data-id="' + t.id + '">Hapus</button></div>' +
        (t.desc ? '<p class="meta">' + esc(t.desc) + '</p>' : '') + '</div>';
    }).join('');
    return '<section class="hero"><h1>Rancang SaaS-mu sampai tuntas</h1>' +
      '<p>20 modul rancangan, Mode Lanjutan, versi, celah, dan ekspor ke Notion atau prompt untuk Claude.</p>' +
      '<div class="acts"><button class="btn gold" data-act="new">+ Rancangan baru</button>' +
      '<label class="btn ghost">Impor JSON<input type="file" accept=".json,application/json" id="imp" hidden></label></div></section>' +
      '<h2 class="sec">Rancanganmu (' + list.length + ')</h2>' +
      (cards || '<div class="empty">Belum ada rancangan. Tekan "Rancangan baru" untuk mulai.</div>') +
      (mine ? '<h2 class="sec">Template pribadi</h2>' + mine : '');
  }

  /* ---------- 1. Pencarian lintas rancangan ---------- */
  function words(q) { return low(q).split(/\s+/).filter(Boolean); }
  function fieldText(f, v) {
    if (f.type === 'list') return (v || []).filter(function (it) { return !itemEmpty(it); }).map(function (it) { return f.sub.map(function (s) { return tr(it[s.id]); }).filter(Boolean).join(' · '); }).join('\n');
    return tr(v);
  }
  function snippet(text, ws) {
    var lt = text.toLowerCase(), at = lt.indexOf(ws[0]), from = Math.max(0, at - 50);
    var s = (from ? '…' : '') + text.slice(from, from + 150) + (text.length > from + 150 ? '…' : '');
    var h = esc(s);
    ws.forEach(function (w) { h = h.replace(new RegExp('(' + esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); });
    return h.replace(/\n/g, ' · ');
  }
  function searchAll(q) {
    var ws = words(q), out = [];
    if (!ws.length || q.trim().length < 2) return out;
    var hit = function (t) { var l = t.toLowerCase(); return ws.every(function (w) { return l.indexOf(w) > -1; }); };
    projects.forEach(function (p) {
      mods(p).forEach(function (m) {
        m.fields.forEach(function (f) {
          var t = fieldText(f, get(p, m.id, f.id));
          if (t && hit(t + ' ' + m.nama + ' ' + f.label)) out.push({ p: p, m: m, f: f, text: t });
        });
      });
      (p.versi || []).forEach(function (v, i) {
        var pel = v.pelajaran || {}, t = [v.catatan, pel.berhasil, pel.gagal].filter(Boolean).join('\n');
        if (t && hit(t)) out.push({ p: p, ver: i, v: v, text: t });
      });
    });
    return out;
  }
  function renderHasil(q) {
    var r = searchAll(q), ws = words(q);
    if (q.trim().length < 2) return '<div class="empty">Ketik minimal 2 huruf. Contoh: "gagal bayar", "tokoId", "WhatsApp".</div>';
    if (!r.length) return '<div class="empty">Tidak ditemukan di rancangan mana pun.</div>';
    return '<p class="note">' + r.length + ' hasil' + (r.length > 60 ? ', menampilkan 60 teratas' : '') + '</p>' + r.slice(0, 60).map(function (x) {
      if (x.v) return '<button class="card res" data-act="gover" data-id="' + x.p.id + '"><p class="meta">' + esc(x.p.nama) + ' › Versi › ' + esc(verLabel(x.v)) + '</p><p>' + snippet(x.text, ws) + '</p></button>';
      return '<button class="card res" data-act="goto" data-id="' + x.p.id + '" data-mid="' + x.m.id + '"><p class="meta">' + esc(x.p.nama) + ' › ' + esc(x.m.nama) + ' › ' + esc(x.f.label) + '</p><p>' + snippet(x.text, ws) + '</p></button>';
    }).join('');
  }
  function renderCari() {
    return '<section class="hero sm"><h1>Cari di semua rancangan</h1><p>Lihat lagi cara yang pernah kamu pakai: aturan, fitur, paket, struktur data, catatan versi, dan pelajaran.</p></section>' +
      '<input id="q" class="inp search" type="search" placeholder="Cari…" value="' + esc(st.q) + '" autocomplete="off"><div id="hasil">' + renderHasil(st.q) + '</div>';
  }

  /* ---------- 2 & 5. Belajar: statistik + pelajaran per versi ---------- */
  function renderBelajar() {
    var nVer = 0, sumSc = 0, cel = {}, modC = {}, nCel = 0;
    projects.forEach(function (p) {
      nVer += (p.versi || []).length; sumSc += totalScore(p);
      celah(p).forEach(function (c) {
        nCel++;
        var k = c.pesan.replace(/"[^"]*"/g, '"…"').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        cel[k] = (cel[k] || 0) + 1; modC[c.mid] = (modC[c.mid] || 0) + 1;
      });
    });
    var top = Object.keys(cel).sort(function (a, b) { return cel[b] - cel[a]; }).slice(0, 5);
    var topM = Object.keys(modC).sort(function (a, b) { return modC[b] - modC[a]; }).slice(0, 5), maxM = topM.length ? modC[topM[0]] : 1;
    var lessons = [];
    projects.forEach(function (p) { (p.versi || []).forEach(function (v, i) { var pl = v.pelajaran || {}; if (tr(pl.berhasil) || tr(pl.gagal)) lessons.push({ p: p, v: v, i: i }); }); });
    lessons.sort(function (a, b) { return (b.v.ubah || b.v.tgl) - (a.v.ubah || a.v.tgl); });
    return '<section class="hero sm"><h1>Perjalananmu</h1><p>Statistik semua rancangan dan pelajaran yang kamu catat setelah setiap rilis.</p></section>' +
      '<div class="kpis"><div><b>' + projects.length + '</b><span>rancangan</span></div><div><b>' + nVer + '</b><span>versi dirilis</span></div>' +
      '<div><b>' + (projects.length ? Math.round(sumSc / projects.length) : 0) + '%</b><span>rata-rata lengkap</span></div><div><b>' + nCel + '</b><span>celah terbuka</span></div></div>' +
      '<h2 class="sec">Modul yang paling sering bercelah</h2>' + (topM.length ? '<div class="card">' + topM.map(function (id) {
        return '<div class="hrow"><span>' + esc(modDef(id).nama) + '</span><div class="bar"><i style="width:' + Math.round(modC[id] / maxM * 100) + '%"></i></div><b>' + modC[id] + '</b></div>';
      }).join('') + '</div>' : '<div class="empty">Belum ada celah. Bagus!</div>') +
      (top.length ? '<h2 class="sec">Celah yang paling sering muncul</h2><ul class="gaps">' + top.map(function (k) {
        return '<li class="gap kuning"><span class="dot"></span><div><p>' + esc(k) + '</p><small>' + cel[k] + ' kali di semua rancangan</small></div></li>';
      }).join('') + '</ul>' : '') +
      '<h2 class="sec">Pelajaran dari setiap rilis</h2>' + (lessons.length ? lessons.map(function (x) {
        var pl = x.v.pelajaran;
        return '<button class="card res" data-act="gover" data-id="' + x.p.id + '"><p class="meta">' + esc(x.p.nama) + ' › ' + esc(verLabel(x.v)) + ' · ' + tgl(x.v.tgl) + '</p>' +
          (tr(pl.berhasil) ? '<p><b class="ok-t">Berhasil:</b> ' + esc(pl.berhasil) + '</p>' : '') + (tr(pl.gagal) ? '<p><b class="bad-t">Perlu diperbaiki:</b> ' + esc(pl.gagal) + '</p>' : '') + '</button>';
      }).join('') : '<div class="empty">Belum ada pelajaran. Setelah merilis versi, buka tab Versi di rancangan lalu isi "Pelajaran setelah rilis".</div>');
  }

  /* ---------- 3. Kamus istilah ---------- */
  function kamusItem(k) {
    return '<details class="kms"><summary>' + esc(k.i) + '</summary><p>' + esc(k.a) + '</p><p class="meta">Contoh: ' + esc(k.c) + '</p>' +
      '<p class="meta">Modul: ' + k.m.map(function (id) { var d = modDef(id); return d ? esc(d.nama) : ''; }).filter(Boolean).join(', ') + '</p></details>';
  }
  function kamusList(q) {
    var ws = words(q), list = KAMUS.filter(function (k) { var t = (k.i + ' ' + k.a + ' ' + k.c).toLowerCase(); return ws.every(function (w) { return t.indexOf(w) > -1; }); });
    return list.length ? list.map(kamusItem).join('') : '<div class="empty">Istilah tidak ditemukan.</div>';
  }
  function renderKamus() {
    return '<section class="hero sm"><h1>Kamus istilah SaaS</h1><p>' + KAMUS.length + ' istilah dengan arti dan contoh. Istilah juga muncul di setiap modul yang memakainya.</p></section>' +
      '<input id="kq" class="inp search" type="search" placeholder="Cari istilah…" value="' + esc(st.kq || '') + '" autocomplete="off"><div id="klist">' + kamusList(st.kq || '') + '</div>';
  }

  /* ---------- Akun, sinkron, dan cadangan ---------- */
  var SYNC_TXT = { mati: 'Hanya di HP ini', memuat: 'Menyiapkan sinkron…', keluar: 'Belum masuk', menyinkron: 'Menyinkron…', tersinkron: 'Tersinkron', offline: 'Offline, menunggu internet', gagal: 'Sinkron gagal' };
  function renderAkun() {
    var s = Sync.state, card;
    if (!Sync.aktif()) card = '<div class="card"><h3>Sinkron cloud belum aktif</h3><p class="meta">Data tersimpan di database HP ini. Supaya aman kalau HP hilang dan bisa dibuka di HP lain, isi FIREBASE_CONFIG di file js/config.js (lihat README).</p></div>';
    else if (s.status === 'keluar' || s.status === 'memuat') card = '<div class="card"><h3>Masuk untuk sinkron</h3><p class="meta">Rancangan, versi, dan template pribadi akan tersimpan di akunmu dan muncul di semua perangkat.</p><div class="acts"><button class="btn gold" data-act="login"' + (s.status === 'memuat' ? ' disabled' : '') + '>Masuk dengan Google</button></div></div>';
    else card = '<div class="card"><h3>' + esc(s.email || 'Akun Google') + '</h3><p class="meta">' + esc(SYNC_TXT[s.status] || s.status) + (s.last ? ' · terakhir ' + new Date(s.last).toLocaleString('id-ID') : '') + '</p>' +
      (s.error ? '<p class="err">' + esc(s.error) + '</p>' : '') + '<div class="acts"><button class="btn" data-act="syncnow">Sinkron sekarang</button><button class="btn ghost danger" data-act="logout">Keluar</button></div></div>';
    var mode = { idb: 'Database HP (IndexedDB)', ls: 'Penyimpanan browser (cadangan)', memory: 'Sementara (akan hilang saat ditutup)' }[Store.mode()];
    return '<section class="hero sm"><h1>Akun & data</h1></section>' + card +
      '<div class="card"><h3>Penyimpanan</h3><p class="meta">' + esc(mode) + ' · ' + projects.length + ' rancangan · ' + tpls.filter(function (t) { return !t.dihapus; }).length + ' template pribadi</p><p class="meta" id="quota"></p>' +
      '<div class="acts"><button class="btn" data-act="cpall">Salin semua (JSON)</button><button class="btn ghost" data-act="dlall">Unduh semua (JSON)</button>' +
      '<label class="btn ghost">Impor JSON<input type="file" accept=".json,application/json" id="imp" hidden></label></div></div>';
  }
  function backupAll() { return JSON.stringify({ aplikasi: 'Blueprint Studio', dibuat: Date.now(), rancangan: projects, template: tpls.filter(function (t) { return !t.dihapus; }) }, null, 2); }
  function showQuota() {
    var el = document.getElementById('quota'); if (!el) return;
    Store.estimate().then(function (e) {
      if (!e || !e.quota || !el.isConnected) return;
      el.textContent = 'Terpakai ' + (e.usage / 1048576).toFixed(1) + ' MB dari kapasitas sekitar ' + Math.round(e.quota / 1048576) + ' MB.';
    });
  }
  function syncChip() {
    var c = document.getElementById('sync'); if (!c) return;
    var s = Sync.state.status;
    c.hidden = !Sync.aktif();
    c.className = 'chip ' + s; c.textContent = SYNC_TXT[s] || s;
  }

  /* ---------- 4. Template pribadi & ambil modul dari rancangan lain ---------- */
  function stripIds(data) {
    Object.keys(data).forEach(function (mid) { Object.keys(data[mid] || {}).forEach(function (k) {
      if (Array.isArray(data[mid][k])) data[mid][k].forEach(function (it) { if (it) delete it._id; });
    }); });
    return data;
  }
  function freshIds(modData) {
    var d = clone(modData || {});
    Object.keys(d).forEach(function (k) { if (Array.isArray(d[k])) d[k].forEach(function (it) { if (it) it._id = uid(); }); });
    return d;
  }
  function kamusModul(m) {
    var list = KAMUS.filter(function (k) { return k.m.indexOf(m.id) > -1; });
    if (!list.length) return '';
    return '<details class="kbox"><summary>Istilah di modul ini (' + list.length + ')</summary>' + list.map(kamusItem).join('') + '</details>';
  }

  function renderProject(p) {
    var sc = totalScore(p), c = celah(p);
    var lv = lastVer(p), dNow = lv ? diffData(lv.data, p.data) : [];
    var tabs = [['modul', 'Modul'], ['celah', 'Celah (' + c.length + ')'], ['versi', lv ? verLabel(lv) : 'Versi'], ['ekspor', 'Ekspor']].map(function (t) {
      return '<button class="tab' + (st.tab === t[0] ? ' on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var head = '<section class="phead"><div class="ring ' + scoreCls(sc) + '" style="--p:' + sc + '"><span>' + sc + '%</span></div>' +
      '<div class="pinfo"><label class="lbl" for="pname">Nama rancangan</label><input id="pname" class="inp" value="' + esc(p.nama) + '" data-act-input="rename">' +
      '<p class="meta">Template: ' + esc((allTemplates().filter(function (t) { return t.id === p.template; })[0] || {}).nama || '-') + '</p></div></section>' +
      '<button class="switch' + (p.lanjut ? ' on' : '') + '" data-act="lanjut" role="switch" aria-checked="' + (p.lanjut ? 'true' : 'false') + '"><span class="knob"></span><span><b>Mode Lanjutan</b><small>' + MODULES.filter(function (m) { return m.adv; }).length + ' modul untuk SaaS yang sudah besar. Saat mati, tidak memengaruhi skor.</small></span></button>' +
      '<nav class="tabs">' + tabs + '</nav>';
    var body = '';
    if (st.tab === 'modul') {
      var card = function (m) {
        var s = modScore(p, m), n = c.filter(function (x) { return x.mid === m.id; }).length, flag = p.cek[m.id];
        return '<button class="card mod" data-act="mod" data-mid="' + m.id + '">' +
          '<div class="row"><span class="num' + (m.adv ? ' adv' : '') + '">' + numOf(m) + '</span><h3>' + m.nama + '</h3><b class="pct ' + scoreCls(s.pct) + '">' + s.pct + '%</b></div>' +
          bar(s.pct) + '<p class="meta">' + m.desc + '</p>' +
          '<div class="tags">' + (n ? '<span class="tag red">' + n + ' celah</span>' : '') +
          (flag ? '<span class="tag gold">Perlu dicek: ' + esc(modDef(flag).nama) + ' berubah</span>' : '') +
          (function () { var md = dNow.filter(function (x) { return x.m.id === m.id; })[0]; if (!md) return ''; var k = countDiff([md]); return '<span class="tag teal">' + (k.tambah + k.ubah + k.hapus) + ' perubahan sejak ' + verLabel(lv) + '</span>'; })() + '</div></button>';
      };
      body = '<h2 class="sec">Modul wajib</h2><div class="grid">' + MODULES.filter(function (m) { return !m.adv; }).map(card).join('') + '</div>' +
        (p.lanjut ? '<h2 class="sec">Mode Lanjutan</h2><div class="grid">' + MODULES.filter(function (m) { return m.adv; }).map(card).join('') + '</div>' : '');
    } else if (st.tab === 'celah') {
      body = c.length ? '<ul class="gaps">' + c.map(function (x) {
        return '<li class="gap ' + x.lv + '" data-act="mod" data-mid="' + x.mid + '"><span class="dot"></span><div><p>' + esc(x.pesan) + '</p><small>Buka modul ' + modDef(x.mid).nama + '</small></div></li>';
      }).join('') + '</ul>' : '<div class="empty">Tidak ada celah yang terdeteksi. Rancanganmu sudah konsisten.</div>';
      body = '<p class="note">Merah = penting diperbaiki sebelum mulai membangun. Kuning = sebaiknya dilengkapi.</p>' + body;
    } else if (st.tab === 'versi') {
      body = renderVersi(p);
    } else {
      body = '<div class="card"><h3>Ekspor rancangan</h3><p class="meta">Markdown bisa langsung ditempel ke Notion. Prompt Pembangunan berisi rancangan plus perintah untuk Claude membangun prototipenya.</p>' +
        '<div class="acts wrap"><button class="btn gold" data-act="cpmd">Salin Markdown</button><button class="btn" data-act="cpprompt">Salin Prompt Pembangunan</button>' +
        '<button class="btn ghost" data-act="dlmd">Unduh .md</button><button class="btn ghost" data-act="dljson">Unduh JSON</button><button class="btn ghost" data-act="cpjson">Salin JSON</button></div></div>' +
        '<div class="card"><h3>Jadikan template pribadi</h3><p class="meta">Rancangan yang sudah terbukti bisa dipakai lagi sebagai titik awal rancangan baru.</p><div class="acts"><button class="btn" data-act="mktpl">Jadikan template</button></div></div>' +
        '<h2 class="sec">Pratinjau</h2><pre class="pre">' + esc(toMarkdown(p)) + '</pre>';
    }
    return head + body;
  }

  function renderVersi(p) {
    var lv = lastVer(p);
    if (!lv) {
      return '<div class="card"><h3>Belum ada versi</h3><p class="meta">Rilis versi pertama saat rancangan sudah siap dibangun. Setelah itu, setiap perubahan ditandai Baru, Diubah, atau Dihapus, dan kamu bisa membuat changelog serta Prompt Pembaruan untuk Claude.</p>' +
        '<div class="acts"><button class="btn gold" data-act="rilis">Rilis v1.0</button></div></div>';
    }
    var d = diffData(lv.data, p.data), n = countDiff(d), dm = dampak(d);
    var opts = function (sel) {
      return p.versi.map(function (v, i) { return '<option value="' + i + '"' + (String(sel) === String(i) ? ' selected' : '') + '>' + esc(verLabel(v)) + '</option>'; }).join('') +
        '<option value="draf"' + (sel === 'draf' ? ' selected' : '') + '>Draf sekarang</option>';
    };
    if (st.cmpA == null || st.cmpA >= p.versi.length) st.cmpA = Math.max(0, p.versi.length - 1);
    if (st.cmpB == null) st.cmpB = 'draf';
    var A = p.versi[st.cmpA] ? p.versi[st.cmpA].data : p.data, B = st.cmpB === 'draf' ? p.data : (p.versi[st.cmpB] || {}).data || p.data;
    var cd = diffData(A, B);
    var hist = p.versi.map(function (v, i) {
      return { v: v, i: i };
    }).reverse().map(function (o) {
      return '<li class="ver"><div class="row"><b class="vno">' + esc(verLabel(o.v)) + '</b><span class="meta">' + tgl(o.v.tgl) + '</span></div>' +
        (o.v.catatan ? '<p>' + esc(o.v.catatan) + '</p>' : '') +
        '<details class="pel"' + (o.v.pelajaran && (tr(o.v.pelajaran.berhasil) || tr(o.v.pelajaran.gagal)) ? ' open' : '') + '><summary>Pelajaran setelah rilis</summary>' +
        '<label class="lbl" for="pb' + o.i + '">Yang berhasil</label><textarea id="pb' + o.i + '" class="inp" rows="2" data-pel="' + o.i + '|berhasil">' + esc((o.v.pelajaran || {}).berhasil) + '</textarea>' +
        '<label class="lbl" for="pg' + o.i + '">Yang gagal / perlu diperbaiki</label><textarea id="pg' + o.i + '" class="inp" rows="2" data-pel="' + o.i + '|gagal">' + esc((o.v.pelajaran || {}).gagal) + '</textarea></details>' +
        '<div class="acts"><button class="btn sm ghost" data-act="vcl" data-i="' + o.i + '">Changelog</button>' +
        (o.i > 0 ? '<button class="btn sm ghost" data-act="vup" data-i="' + o.i + '">Prompt Pembaruan</button>' : '') +
        '<button class="btn sm ghost" data-act="vmd" data-i="' + o.i + '">Markdown</button>' +
        '<button class="btn sm ghost danger" data-act="askrestore" data-i="' + o.i + '">Pulihkan ke draf</button></div></li>';
    }).join('');
    return '<div class="card"><div class="row"><h3>Perubahan sejak ' + esc(verLabel(lv)) + '</h3></div>' +
      '<div class="stats"><span><b class="nw">' + n.tambah + '</b> baru</span><span><b class="chg">' + n.ubah + '</b> diubah</span><span><b class="del">' + n.hapus + '</b> dihapus</span></div>' +
      '<div class="acts wrap"><button class="btn gold" data-act="rilis">Rilis v' + esc(nextNo(p)) + '</button>' +
      '<button class="btn" data-act="cpupd"' + (d.length ? '' : ' disabled') + '>Salin Prompt Pembaruan</button>' +
      '<button class="btn ghost" data-act="cpcl"' + (d.length ? '' : ' disabled') + '>Salin Changelog</button></div></div>' +
      (dm.length ? '<h2 class="sec">Dampak perubahan</h2><ul class="gaps">' + dm.map(function (x) {
        return '<li class="gap ' + (x.lv === 'info' ? 'info' : x.lv) + '"><span class="dot"></span><div><p>' + esc(x.pesan) + '</p></div></li>';
      }).join('') + '</ul>' : '') +
      '<h2 class="sec">Bandingkan versi</h2><div class="cmp"><label class="lbl" for="cmpA">Dari</label><select id="cmpA" class="inp">' + opts(st.cmpA) + '</select>' +
      '<label class="lbl" for="cmpB">Ke</label><select id="cmpB" class="inp">' + opts(st.cmpB) + '</select></div>' + renderDiff(cd) +
      '<h2 class="sec">Riwayat versi</h2><ul class="vers">' + hist + '</ul>';
  }
  function renderDiff(d) {
    if (!d.length) return '<div class="empty">Tidak ada perbedaan.</div>';
    return d.map(function (md) {
      return '<div class="card diff"><h3>' + esc(md.m.nama) + '</h3>' + md.fields.map(function (x) {
        var h = '<p class="dl">' + esc(x.f.label) + '</p>';
        if (x.list) {
          h += x.added.map(function (it) { return '<p class="dx nw">+ ' + esc(itemTitle(x.f, it)) + '</p>'; }).join('');
          h += x.changed.map(function (c) {
            return '<p class="dx chg">~ ' + esc(itemTitle(x.f, c.item)) + '</p>' + c.diffs.map(function (z) {
              return '<p class="dz"><span>' + esc(z.label) + ':</span> <del>' + esc(short(z.from)) + '</del> → <ins>' + esc(short(z.to)) + '</ins></p>';
            }).join('');
          }).join('');
          h += x.removed.map(function (it) { return '<p class="dx del">− ' + esc(itemTitle(x.f, it)) + '</p>'; }).join('');
        } else h += '<p class="dz"><del>' + esc(short(x.from)) + '</del> → <ins>' + esc(short(x.to)) + '</ins></p>';
        return h;
      }).join('') + '</div>';
    }).join('');
  }
  function modalRilis(p) {
    var lv = lastVer(p), n = lv ? countDiff(diffData(lv.data, p.data)) : null;
    modal('<h3>Rilis versi</h3>' + (n ? '<p>Sejak ' + esc(verLabel(lv)) + ': ' + n.tambah + ' baru, ' + n.ubah + ' diubah, ' + n.hapus + ' dihapus.</p>' : '<p>Isi rancangan saat ini akan dibekukan sebagai versi pertama.</p>') +
      '<label class="lbl" for="vno">Nomor versi</label><input id="vno" class="inp" value="' + esc(nextNo(p)) + '">' +
      '<label class="lbl" for="vcat">Catatan versi</label><textarea id="vcat" class="inp" rows="3" placeholder="Mis. Tambah paket Bisnis dan fitur domain sendiri"></textarea>' +
      '<p id="verr" class="err"></p><div class="acts"><button class="btn ghost" data-act="close">Batal</button><button class="btn gold" data-act="dorilis">Rilis</button></div>');
  }

  function renderField(m, f, v) {
    var path = m.id + '|' + f.id;
    var hint = f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '';
    var req = f.req ? ' <em>wajib</em>' : '';
    var lv = lastVer(cur()), base = lv ? getIn(lv.data, m.id, f) : null;
    if (f.type === 'list') {
      var bmap = {};
      if (base) base.forEach(function (x) { if (!itemEmpty(x)) bmap[x._id] = x; });
      var badge = function (it) {
        if (!lv || itemEmpty(it)) return '';
        var o = bmap[it._id];
        if (!o) return '<span class="vb nw">Baru</span>';
        return f.sub.some(function (s) { return tr(o[s.id]) !== tr(it[s.id]); }) ? '<span class="vb chg">Diubah</span>' : '';
      };
      var ids = {}; (v || []).forEach(function (it) { ids[it._id] = 1; });
      var gone = lv ? Object.keys(bmap).filter(function (k) { return !ids[k]; }).map(function (k) { return itemTitle(f, bmap[k]); }) : [];
      var items = (v || []).map(function (it, i) {
        return '<div class="item"><div class="ihead"><b>' + (i + 1) + '</b>' + badge(it) +
          '<button class="icon" data-act="up" data-m="' + m.id + '" data-f="' + f.id + '" data-i="' + i + '" aria-label="Naikkan"' + (i ? '' : ' disabled') + '>↑</button>' +
          '<button class="icon danger" data-act="delitem" data-m="' + m.id + '" data-f="' + f.id + '" data-i="' + i + '" aria-label="Hapus">✕</button></div>' +
          f.sub.map(function (s) { return input(s, it[s.id], path + '|' + i + '|' + s.id); }).join('') + '</div>';
      }).join('');
      return '<fieldset class="fld"><legend>' + esc(f.label) + req + '</legend>' + hint +
        (gone.length ? '<p class="gone">Dihapus sejak ' + esc(verLabel(lv)) + ': ' + gone.map(esc).join(', ') + '</p>' : '') + items +
        '<button class="btn ghost add" data-act="additem" data-m="' + m.id + '" data-f="' + f.id + '">+ Tambah ' + esc(f.sub[0].label.toLowerCase()) + '</button></fieldset>';
    }
    var vchg = lv && tr(base) !== tr(v) ? ' <span class="vb chg">Diubah</span>' : '';
    return '<div class="fld">' + input(f, v, path, (req || '') + vchg, hint) + '</div>';
  }
  var fid = 0;
  function input(f, v, path, req, hint) {
    var id = 'f' + (++fid), lab = '<label class="lbl" for="' + id + '">' + esc(f.label) + (req || '') + '</label>' + (hint || '');
    var a = ' id="' + id + '" data-path="' + path + '"';
    if (f.type === 'textarea') return lab + '<textarea class="inp" rows="3"' + a + '>' + esc(v) + '</textarea>';
    if (f.type === 'select') return lab + '<select class="inp"' + a + '>' + f.options.map(function (o) {
      return '<option value="' + esc(o) + '"' + ((v || f.options[0]) === o ? ' selected' : '') + '>' + (o ? esc(o) : 'Pilih…') + '</option>';
    }).join('') + '</select>';
    return lab + '<input class="inp" type="' + (f.type === 'number' ? 'number' : 'text') + '" inputmode="' + (f.type === 'number' ? 'numeric' : 'text') + '"' + a + ' value="' + esc(v) + '">';
  }

  function renderModule(p, m) {
    var list = mods(p), i = list.indexOf(m), s = modScore(p, m), flag = p.cek[m.id];
    var gaps = celah(p).filter(function (x) { return x.mid === m.id; });
    var prev = list[i - 1], next = list[i + 1];
    return '<section class="mhead"><p class="meta">' + (m.adv ? 'Mode Lanjutan · ' : '') + 'Modul ' + numOf(m) + ' · ' + (i + 1) + ' dari ' + list.length + '</p><p>' + m.desc + '</p>' +
      '<div class="row"><span id="mscore" class="pct ' + scoreCls(s.pct) + '">' + s.pct + '% lengkap</span></div><div id="mbar">' + bar(s.pct) + '</div></section>' +
      (flag ? '<div class="flag"><p>Modul <b>' + esc(modDef(flag).nama) + '</b> berubah. Cek apakah isi modul ini masih sesuai.</p><button class="btn sm gold" data-act="checked">Sudah dicek</button></div>' : '') +
      (gaps.length ? '<ul class="gaps">' + gaps.map(function (x) { return '<li class="gap ' + x.lv + '"><span class="dot"></span><div><p>' + esc(x.pesan) + '</p></div></li>'; }).join('') + '</ul>' : '') +
      m.fields.map(function (f) { return renderField(m, f, get(p, m.id, f.id)); }).join('') +
      kamusModul(m) +
      (projects.length > 1 ? '<button class="btn ghost wide" data-act="take">Ambil isi modul ini dari rancangan lain</button>' : '') +
      '<nav class="pager">' + (prev ? '<button class="btn ghost" data-act="mod" data-mid="' + prev.id + '">‹ ' + prev.nama + '</button>' : '<span></span>') +
      (next ? '<button class="btn gold" data-act="mod" data-mid="' + next.id + '">' + next.nama + ' ›</button>' : '<button class="btn gold" data-act="tocelah">Lihat celah ›</button>') + '</nav>';
  }

  /* ---------- perubahan data ---------- */
  function touched(p, mid) {
    p.diubah = Date.now();
    (DEPS[mid] || []).forEach(function (d) { if (d !== mid) p.cek[d] = mid; });
    save();
  }
  function updateScore(p) {
    var m = modDef(st.mid), s = modScore(p, m), el = document.getElementById('mscore');
    if (el) { el.textContent = s.pct + '% lengkap'; el.className = 'pct ' + scoreCls(s.pct); document.getElementById('mbar').innerHTML = bar(s.pct); }
  }

  app.addEventListener('input', function (e) {
    var t = e.target, p = cur();
    if (t.id === 'q') { st.q = t.value; document.getElementById('hasil').innerHTML = renderHasil(t.value); return; }
    if (t.id === 'kq') { st.kq = t.value; document.getElementById('klist').innerHTML = kamusList(t.value); return; }
    var pel = t.getAttribute('data-pel');
    if (pel && p) {
      var pk = pel.split('|'), vv = p.versi[+pk[0]];
      vv.pelajaran = vv.pelajaran || {}; vv.pelajaran[pk[1]] = t.value; vv.ubah = Date.now(); p.diubah = Date.now(); save(); return;
    }
    if (t.id === 'pname' && p) { p.nama = t.value; document.getElementById('ttl').textContent = t.value || 'Tanpa nama'; p.diubah = Date.now(); save(); return; }
    var path = t.getAttribute('data-path');
    if (!path || !p) return;
    var k = path.split('|');
    if (k.length === 2) setv(p, k[0], k[1], t.value);
    else {
      var list = get(p, k[0], k[1]).slice();
      list[+k[2]] = Object.assign({}, list[+k[2]]); list[+k[2]][k[3]] = t.value;
      setv(p, k[0], k[1], list);
    }
    touched(p, k[0]);
    updateScore(p);
    liveBadge(p, t, k);
  });
  /* label Baru/Diubah langsung diperbarui saat mengetik */
  function liveBadge(p, t, k) {
    var lv = lastVer(p); if (!lv) return;
    var f = modDef(k[0]).fields.filter(function (x) { return x.id === k[1]; })[0], html = '', host;
    if (k.length === 2) {
      host = app.querySelector('label[for="' + t.id + '"]');
      if (tr(getIn(lv.data, k[0], f)) !== tr(t.value)) html = '<span class="vb chg">Diubah</span>';
    } else {
      var it = get(p, k[0], k[1])[+k[2]], o = getIn(lv.data, k[0], f).filter(function (x) { return x._id === it._id; })[0];
      host = t.closest('.item').querySelector('.ihead b');
      if (!itemEmpty(it)) html = !o ? '<span class="vb nw">Baru</span>' : (f.sub.some(function (sb) { return tr(o[sb.id]) !== tr(it[sb.id]); }) ? '<span class="vb chg">Diubah</span>' : '');
    }
    if (!host) return;
    var old = k.length === 2 ? host.querySelector('.vb') : (host.nextElementSibling && host.nextElementSibling.classList.contains('vb') ? host.nextElementSibling : null);
    if (old) old.remove();
    if (html) host.insertAdjacentHTML(k.length === 2 ? 'beforeend' : 'afterend', html);
  }
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'imp' && t.files && t.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result), arr = Array.isArray(d) ? d : (d && Array.isArray(d.rancangan) ? d.rancangan : [d]), n = 0, nt = 0, skip = 0;
          if (d && Array.isArray(d.template)) d.template.forEach(function (x) {
            if (x && x.data && !tpls.some(function (t) { return t.id === x.id; })) { tpls.push({ id: x.id || 'u' + uid(), nama: String(x.nama || 'Template'), desc: String(x.desc || ''), data: x.data, lanjut: !!x.lanjut, diubah: Date.now() }); nt++; }
          });
          arr.forEach(function (x) {
            if (x && x.data && typeof x.data === 'object') {
              var full = !Array.isArray(d) && d && Array.isArray(d.rancangan);
              if (full && x.id && projects.some(function (q) { return q.id === x.id; })) { skip++; return; }
              projects.push(fixProject({ id: full && x.id ? x.id : uid(), nama: String(x.nama || 'Impor'), template: x.template || 'kosong', dibuat: Date.now(), diubah: Date.now(), data: x.data, cek: {}, lanjut: !!x.lanjut, versi: Array.isArray(x.versi) ? x.versi : [] })); n++;
            }
          });
          saveNow(); render(); toast(n || nt ? n + ' rancangan' + (nt ? ' dan ' + nt + ' template' : '') + ' diimpor' + (skip ? ', ' + skip + ' sudah ada dilewati' : '') : (skip ? 'Semua rancangan di file ini sudah ada' : 'File tidak berisi rancangan Blueprint Studio'));
        } catch (err) { toast('File JSON tidak valid'); }
      };
      r.readAsText(t.files[0]);
    }
    if (t.id === 'cmpA' || t.id === 'cmpB') {
      var val = t.value === 'draf' ? 'draf' : +t.value;
      if (t.id === 'cmpA') st.cmpA = val; else st.cmpB = val;
      var y = window.scrollY; render(); window.scrollTo(0, y); return;
    }
    if (t.tagName === 'SELECT') updateScore(cur());
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), p = cur();
    if (b.closest('.acts') && b.closest('.proj')) e.stopPropagation();
    switch (act) {
      case 'open': st.cmpA = null; st.cmpB = null; st.pid = b.getAttribute('data-id'); st.view = 'proyek'; st.tab = 'modul'; render(); break;
      case 'new': modalNew(); break;
      case 'pick':
        var nm = document.getElementById('nname').value.trim(), tid = b.getAttribute('data-tid');
        var np = newProject(nm, tid); if (!nm && tid === 'kosong') np.nama = 'Rancangan baru';
        projects.push(np); saveNow(); closeModal(); st.pid = np.id; st.view = 'proyek'; st.tab = 'modul'; render(); break;
      case 'close': closeModal(); break;
      case 'dup':
        var src = projects.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        var cp = clone(src); cp.id = uid(); cp.nama = src.nama + ' (salinan)'; cp.diubah = Date.now();
        projects.push(cp); saveNow(); render(); toast('Rancangan diduplikat'); break;
      case 'askdel':
        var dp = projects.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        modal('<h3>Hapus rancangan?</h3><p>"' + esc(dp.nama) + '" akan dihapus permanen. Unduh JSON dulu kalau mau menyimpan cadangan.</p>' +
          '<div class="acts"><button class="btn ghost" data-act="close">Batal</button><button class="btn danger-solid" data-act="del" data-id="' + dp.id + '">Hapus</button></div>'); break;
      case 'del':
        projects = projects.filter(function (x) { return x.id !== b.getAttribute('data-id'); }); saveNow(); closeModal(); render(); toast('Rancangan dihapus'); break;
      case 'tab': st.tab = b.getAttribute('data-tab'); render(); break;
      case 'mod': st.mid = b.getAttribute('data-mid'); st.view = 'modul'; render(); break;
      case 'tocelah': st.view = 'proyek'; st.tab = 'celah'; render(); break;
      case 'checked': delete p.cek[st.mid]; p.diubah = Date.now(); save(); render(); break;
      case 'lanjut': p.lanjut = !p.lanjut; p.diubah = Date.now(); saveNow(); render(); toast(p.lanjut ? 'Mode Lanjutan aktif' : 'Mode Lanjutan dimatikan (isinya tetap tersimpan)'); break;
      case 'additem': case 'delitem': case 'up':
        var m = b.getAttribute('data-m'), f = b.getAttribute('data-f'), list = get(p, m, f).slice(), i = +b.getAttribute('data-i');
        if (act === 'additem') list.push({ _id: uid() });
        if (act === 'delitem') list.splice(i, 1);
        if (act === 'up' && i > 0) { var tmp = list[i - 1]; list[i - 1] = list[i]; list[i] = tmp; }
        setv(p, m, f, list); touched(p, m);
        var y = window.scrollY; render(); window.scrollTo(0, y);
        if (act === 'additem') { var its = app.querySelectorAll('[data-path^="' + m + '|' + f + '|' + (list.length - 1) + '|"]'); if (its[0]) its[0].focus(); }
        break;
      case 'cpmd': copy(toMarkdown(p), 'Markdown'); break;
      case 'cpprompt': copy(toPrompt(p), 'Prompt Pembangunan'); break;
      case 'cpjson': copy(JSON.stringify(p, null, 2), 'JSON'); break;
      case 'rilis': modalRilis(p); break;
      case 'home': st.home = b.getAttribute('data-h'); render(); break;
      case 'goto': st.pid = b.getAttribute('data-id'); st.mid = b.getAttribute('data-mid'); st.tab = 'modul'; st.view = 'modul'; render(); break;
      case 'gover': st.cmpA = null; st.cmpB = null; st.pid = b.getAttribute('data-id'); st.view = 'proyek'; st.tab = 'versi'; render(); break;
      case 'login': Sync.login().catch(function (e) { toast('Gagal masuk: ' + ((e && e.message) || e)); }); break;
      case 'logout': Sync.logout(); break;
      case 'syncnow': Sync.syncNow(); break;
      case 'cpall': copy(backupAll(), 'Semua data'); break;
      case 'dlall': download('blueprint-studio-cadangan-' + new Date().toISOString().slice(0, 10) + '.json', backupAll(), 'application/json'); break;
      case 'mktpl':
        modal('<h3>Jadikan template pribadi</h3><label class="lbl" for="tnm">Nama template</label><input id="tnm" class="inp" value="' + esc(p.nama) + '">' +
          '<label class="lbl" for="tds">Keterangan</label><textarea id="tds" class="inp" rows="2" placeholder="Mis. Pola SaaS langganan dengan order WhatsApp"></textarea>' +
          '<div class="acts"><button class="btn ghost" data-act="close">Batal</button><button class="btn gold" data-act="domktpl">Simpan template</button></div>'); break;
      case 'domktpl':
        tpls.push({ id: 'u' + uid(), nama: tr(document.getElementById('tnm').value) || p.nama, desc: tr(document.getElementById('tds').value), data: stripIds(clone(p.data)), lanjut: !!p.lanjut, diubah: Date.now() });
        saveNow(); closeModal(); toast('Template pribadi disimpan'); break;
      case 'askdeltpl': var dt = tpls.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        modal('<h3>Hapus template?</h3><p>Template "' + esc(dt.nama) + '" dihapus. Rancangan yang pernah dibuat dari template ini tidak ikut terhapus.</p><div class="acts"><button class="btn ghost" data-act="close">Batal</button><button class="btn danger-solid" data-act="deltpl" data-id="' + dt.id + '">Hapus</button></div>'); break;
      case 'deltpl': tpls = tpls.filter(function (x) { return x.id !== b.getAttribute('data-id'); }); saveNow(); closeModal(); render(); toast('Template dihapus'); break;
      case 'take':
        var others = projects.filter(function (x) { return x.id !== p.id; }), md = modDef(st.mid);
        modal('<h3>Ambil isi "' + esc(md.nama) + '"</h3><p>Pilih rancangan sumber. Isi modul ini akan diganti.</p><div class="tpls">' + others.map(function (x) {
          var sc = modScore(x, md).pct;
          return '<button class="card tpl" data-act="dotake" data-id="' + x.id + '"' + (sc ? '' : ' disabled') + '><div class="row"><h3>' + esc(x.nama) + '</h3><b class="pct ' + scoreCls(sc) + '">' + sc + '%</b></div></button>';
        }).join('') + '</div><div class="acts"><button class="btn ghost" data-act="close">Batal</button></div>'); break;
      case 'dotake':
        var src = projects.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        p.data[st.mid] = freshIds(src.data[st.mid]); touched(p, st.mid); closeModal(); render(); toast('Isi modul diambil dari ' + src.nama); break;
      case 'dorilis':
        var no = tr(document.getElementById('vno').value).replace(/^v/i, ''), err = document.getElementById('verr');
        if (!no) { err.textContent = 'Nomor versi wajib diisi.'; break; }
        if (p.versi.some(function (v) { return String(v.no) === no; })) { err.textContent = 'Versi ' + no + ' sudah ada.'; break; }
        p.versi.push({ id: uid(), no: no, tgl: Date.now(), ubah: Date.now(), catatan: tr(document.getElementById('vcat').value), data: clone(p.data), lanjut: !!p.lanjut });
        p.cek = {}; p.diubah = Date.now(); st.cmpA = p.versi.length - 1; st.cmpB = 'draf';
        saveNow(); closeModal(); render(); toast('v' + no + ' dirilis'); break;
      case 'cpcl': var lv0 = lastVer(p); copy(changelog(diffData(lv0.data, p.data), verLabel(lv0) + ' → draf'), 'Changelog'); break;
      case 'cpupd': copy(updatePrompt(p, lastVer(p), p.data, 'v' + nextNo(p)), 'Prompt Pembaruan'); break;
      case 'vcl': var vi = +b.getAttribute('data-i'), vv = p.versi[vi];
        copy(vi ? changelog(diffData(p.versi[vi - 1].data, vv.data), verLabel(p.versi[vi - 1]) + ' → ' + verLabel(vv) + (vv.catatan ? ' — ' + vv.catatan : '')) : '## ' + verLabel(vv) + '\n\nRilis pertama.' + (vv.catatan ? ' ' + vv.catatan : '') + '\n', 'Changelog ' + verLabel(vv)); break;
      case 'vup': var ui = +b.getAttribute('data-i'); copy(updatePrompt(p, p.versi[ui - 1], p.versi[ui].data, verLabel(p.versi[ui])), 'Prompt Pembaruan ' + verLabel(p.versi[ui])); break;
      case 'vmd': var mi = +b.getAttribute('data-i'); copy(toMarkdown(verProject(p, p.versi[mi])), 'Markdown ' + verLabel(p.versi[mi])); break;
      case 'askrestore': var ri = +b.getAttribute('data-i');
        modal('<h3>Pulihkan ' + esc(verLabel(p.versi[ri])) + ' ke draf?</h3><p>Isi draf sekarang diganti dengan isi ' + esc(verLabel(p.versi[ri])) + '. Perubahan draf yang belum dirilis akan hilang. Riwayat versi tetap utuh.</p>' +
          '<div class="acts"><button class="btn ghost" data-act="close">Batal</button><button class="btn danger-solid" data-act="restore" data-i="' + ri + '">Pulihkan</button></div>'); break;
      case 'restore': var rj = +b.getAttribute('data-i'); p.data = clone(p.versi[rj].data); p.lanjut = !!p.versi[rj].lanjut; p.diubah = Date.now(); saveNow(); closeModal(); render(); toast('Draf dipulihkan ke ' + verLabel(p.versi[rj])); break;
      case 'dlmd': download(slug(p.nama) + '.md', toMarkdown(p), 'text/markdown'); break;
      case 'dljson': download(slug(p.nama) + '.json', JSON.stringify(p, null, 2), 'application/json'); break;
    }
  });

  function modalNew() {
    modal('<h3>Rancangan baru</h3><label class="lbl" for="nname">Nama rancangan</label><input id="nname" class="inp" placeholder="Mis. Stivora SaaS">' +
      '<p class="lbl">Pilih template</p><div class="tpls">' + allTemplates().map(function (t) {
        return '<button class="card tpl" data-act="pick" data-tid="' + t.id + '"><div class="row"><h3>' + esc(t.nama) + '</h3>' + (t.id.charAt(0) === 'u' ? '<span class="tag gold">Pribadi</span>' : '') + '</div><p class="meta">' + esc(t.desc || '') + '</p></button>';
      }).join('') + '</div><div class="acts"><button class="btn ghost" data-act="close">Batal</button></div>');
  }

  document.getElementById('back').addEventListener('click', function () {
    if (st.view === 'modul') { st.view = 'proyek'; } else { st.view = 'home'; saveNow(); }
    render();
  });
  document.getElementById('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('pagehide', saveNow);

  /* ---------- mulai ---------- */
  app.innerHTML = '<div class="empty">Memuat database…</div>';
  function hooks() {
    return {
      getProject: function (id) { return projects.filter(function (x) { return x.id === id; })[0]; },
      listProjects: function () { return projects; },
      applyProject: function (r) {
        var p = fixProject(r), i = projects.map(function (x) { return x.id; }).indexOf(p.id);
        if (i > -1) projects[i] = p; else projects.push(p);
        savedP[p.id] = p.diubah; softRender(); return Store.putProject(p);
      },
      removeProject: function (id) {
        projects = projects.filter(function (x) { return x.id !== id; }); delete savedP[id];
        if (st.pid === id) st.view = 'home';
        softRender(); return Store.delProject(id);
      },
      getTemplate: function (id) { return tpls.filter(function (x) { return x.id === id; })[0]; },
      listTemplates: function () { return tpls; },
      applyTemplate: function (t) {
        var i = tpls.map(function (x) { return x.id; }).indexOf(t.id);
        if (i > -1) tpls[i] = t; else tpls.push(t);
        savedT[t.id] = t.diubah; softRender(); return Store.putTemplate(t);
      },
      removeTemplate: function (id) { tpls = tpls.filter(function (x) { return x.id !== id; }); delete savedT[id]; softRender(); return Store.delTemplate(id); },
      onState: function () { syncChip(); if (st.view === 'home' && st.home === 'akun') softRender(); }
    };
  }
  Store.init().then(function (r) {
    projects = r.projects.map(fixProject); tpls = r.templates || [];
    projects.forEach(function (p) { savedP[p.id] = p.diubah; });
    tpls.forEach(function (t) { savedT[t.id] = t.diubah; });
    return Store.getMeta('seeded').then(function (seeded) {
      if (!seeded && !projects.length && !Sync.aktif()) projects.push(newProject('Contoh: Katalog UMKM', 'katalog'));
      if (!seeded) Store.setMeta('seeded', Date.now());
      saveNow(); render();
      if (r.migrated) toast(r.migrated + ' rancangan lama dipindahkan ke database');
      if (Store.mode() === 'memory') toast('Penyimpanan tidak tersedia di sini: data hilang saat halaman ditutup.');
      Sync.start(hooks());
    });
  }).catch(function (e) { app.innerHTML = '<div class="empty">Gagal membuka database: ' + esc((e && e.message) || e) + '</div>'; });
  document.addEventListener('focusout', function () { setTimeout(function () { if (pendingRender && !document.getElementById('modal').classList.contains('on')) softRender(); }, 50); });

  /* PWA: offline setelah dibuka sekali (hanya saat di-hosting) */
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !window.BS_INLINE) navigator.serviceWorker.register('sw.js').catch(function () {});
  } catch (e) {}
})();
