/* Blueprint Studio — database
   Store : IndexedDB di HP (cadangan: localStorage bila IndexedDB tidak tersedia)
   Sync  : sinkron ke Firebase (login Google + Firestore) bila FIREBASE_CONFIG diisi */
(function () {
  var DB_NAME = 'blueprint-studio', DB_VER = 1, OLD_KEY = 'bs_projects_v1';
  var db = null, mode = 'idb', memory = { projects: {}, templates: {}, meta: {} };

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function openIdb() {
    return new Promise(function (res, rej) {
      try {
        var rq = indexedDB.open(DB_NAME, DB_VER);
        rq.onupgradeneeded = function () {
          var d = rq.result;
          if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('templates')) d.createObjectStore('templates', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
        };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
        rq.onblocked = function () { rej(new Error('blocked')); };
      } catch (e) { rej(e); }
    });
  }
  function tx(store, type, fn) {
    return new Promise(function (res, rej) {
      var t = db.transaction(store, type), s = t.objectStore(store), out;
      out = fn(s);
      t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
      t.onerror = function () { rej(t.error); };
      t.onabort = function () { rej(t.error); };
    });
  }
  function all(store) {
    if (mode !== 'idb') return Promise.resolve(Object.keys(memory[store]).map(function (k) { return memory[store][k]; }));
    return tx(store, 'readonly', function (s) { return s.getAll(); });
  }
  function put(store, obj, key) {
    var o = JSON.parse(JSON.stringify(obj));
    if (mode !== 'idb') { memory[store][key || o.id] = o; return flushLs(); }
    return tx(store, 'readwrite', function (s) { return key ? s.put(o, key) : s.put(o); });
  }
  function del(store, id) {
    if (mode !== 'idb') { delete memory[store][id]; return flushLs(); }
    return tx(store, 'readwrite', function (s) { return s.delete(id); });
  }
  function flushLs() {
    if (mode === 'ls') {
      lsSet('bs_store_projects', memory.projects); lsSet('bs_store_templates', memory.templates); lsSet('bs_store_meta', memory.meta);
    }
    return Promise.resolve();
  }

  var Store = {
    mode: function () { return mode; },
    init: function () {
      return openIdb().then(function (d) { db = d; mode = 'idb'; }, function () {
        try { localStorage.setItem('bs_test', '1'); localStorage.removeItem('bs_test'); mode = 'ls'; } catch (e) { mode = 'memory'; }
        if (mode === 'ls') {
          memory.projects = lsGet('bs_store_projects', {}); memory.templates = lsGet('bs_store_templates', {}); memory.meta = lsGet('bs_store_meta', {});
        }
      }).then(function () {
        return Promise.all([all('projects'), all('templates'), Store.getMeta('migrated')]);
      }).then(function (r) {
        var projects = r[0], templates = r[1];
        /* pindahkan data lama (versi sebelum database) sekali saja */
        if (!r[2]) {
          var old = lsGet(OLD_KEY, null);
          if (Array.isArray(old) && old.length) {
            var have = {}; projects.forEach(function (p) { have[p.id] = 1; });
            old.forEach(function (p) { if (p && p.id && !have[p.id]) projects.push(p); });
            return Promise.all(old.map(function (p) { return put('projects', p); })).then(function () {
              lsSet(OLD_KEY + '_cadangan', old);
              try { localStorage.removeItem(OLD_KEY); } catch (e) {}
              return Store.setMeta('migrated', Date.now());
            }).then(function () { return { projects: projects, templates: templates, migrated: old.length }; });
          }
          return Store.setMeta('migrated', Date.now()).then(function () { return { projects: projects, templates: templates, migrated: 0 }; });
        }
        return { projects: projects, templates: templates, migrated: 0 };
      });
    },
    putProject: function (p) { return put('projects', p); },
    delProject: function (id) { return del('projects', id); },
    putTemplate: function (t) { return put('templates', t); },
    delTemplate: function (id) { return del('templates', id); },
    getMeta: function (k) {
      if (mode !== 'idb') return Promise.resolve(memory.meta[k]);
      return tx('meta', 'readonly', function (s) { return s.get(k); });
    },
    setMeta: function (k, v) { return put('meta', v === undefined ? null : v, k); },
    estimate: function () {
      try { if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate(); } catch (e) {}
      return Promise.resolve(null);
    }
  };

  /* ================= SINKRON FIREBASE ================= */
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var H = null; /* hook dari app.js */
  var fb = { auth: null, fs: null, user: null };
  var state = { status: 'mati', email: '', last: 0, error: '' };
  var pushTimer = null, busy = false, again = false;

  function setState(o) { Object.keys(o).forEach(function (k) { state[k] = o[k]; }); if (H && H.onState) H.onState(state); }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }
  function clean(o) { return JSON.parse(JSON.stringify(o)); }
  function uref() { return fb.fs.collection('users').doc(fb.user.uid); }
  function getTomb() { return Store.getMeta('tombstones').then(function (t) { return t || { p: {}, t: {} }; }); }
  function clearTomb(done) {
    return getTomb().then(function (t) {
      Object.keys(done.p).forEach(function (id) { delete t.p[id]; });
      Object.keys(done.t).forEach(function (id) { delete t.t[id]; });
      return Store.setMeta('tombstones', t);
    });
  }
  function addTomb(kind, id) { return getTomb().then(function (t) { t[kind][id] = Date.now(); return Store.setMeta('tombstones', t); }); }

  function projDoc(p) {
    var o = clean(p); delete o.versi; return o;
  }
  function pushProject(p) {
    var ref = uref().collection('projects').doc(p.id), batch = fb.fs.batch(), sent = [];
    batch.set(ref, projDoc(p));
    (p.versi || []).forEach(function (v) {
      if (!v.syncedAt || (v.ubah || v.tgl) > v.syncedAt) {
        var o = clean(v); delete o.syncedAt;
        batch.set(ref.collection('versi').doc(v.id), o); sent.push(v);
      }
    });
    return batch.commit().then(function () {
      sent.forEach(function (v) { v.syncedAt = v.ubah || v.tgl; });
      if (sent.length) return Store.putProject(p);
    });
  }
  function pullProject(doc) {
    var r = doc.data();
    return doc.ref.collection('versi').get().then(function (snap) {
      var remoteV = snap.docs.map(function (d) { var v = d.data(); v.id = d.id; v.syncedAt = v.ubah || v.tgl; return v; });
      var local = H.getProject(doc.id), byId = {};
      (local && local.versi || []).forEach(function (v) { byId[v.id] = v; });
      remoteV.forEach(function (v) { var l = byId[v.id]; if (!l || (v.ubah || v.tgl) >= (l.ubah || l.tgl)) byId[v.id] = v; });
      r.id = doc.id;
      r.versi = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.tgl - b.tgl; });
      return H.applyProject(r);
    });
  }
  function removeRemote(ref) {
    return ref.collection('versi').get().then(function (snap) {
      var b = fb.fs.batch();
      snap.docs.forEach(function (d) { b.delete(d.ref); });
      b.set(ref, { dihapus: true, diubah: Date.now() });
      return b.commit();
    });
  }

  var pending = {};
  function pushPending() {
    if (!fb.user) return Promise.resolve();
    if (busy) { clearTimeout(pushTimer); pushTimer = setTimeout(pushPending, 1500); return Promise.resolve(); }
    var items = Object.keys(pending).map(function (k) { return pending[k]; }); pending = {};
    busy = true; setState({ status: 'menyinkron', error: '' });
    var tomb;
    return getTomb().then(function (tb) {
      tomb = tb;
      var jobs = Object.keys(tomb.p).map(function (id) { return removeRemote(uref().collection('projects').doc(id)); })
        .concat(Object.keys(tomb.t).map(function (id) { return uref().collection('templates').doc(id).set({ dihapus: true, diubah: Date.now() }); }));
      items.forEach(function (it) {
        if (it[0] === 'p') { var p = H.getProject(it[1]); if (p) jobs.push(pushProject(p)); }
        else { var t = H.getTemplate(it[1]); if (t) jobs.push(uref().collection('templates').doc(t.id).set(clean(t))); }
      });
      return Promise.all(jobs).then(function () { return clearTomb(tomb); });
    }).then(function () {
      busy = false; setState({ status: 'tersinkron', last: Date.now() }); Store.setMeta('lastSync', Date.now());
    }, function (e) {
      busy = false; items.forEach(function (it) { pending[it[0] + ':' + it[1]] = it; });
      setState({ status: navigator.onLine === false ? 'offline' : 'gagal', error: (e && e.message) || String(e) });
    });
  }

  function fullSync() {
    if (!fb.user) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; setState({ status: 'menyinkron', error: '' });
    var tomb;
    return getTomb().then(function (t) {
      tomb = t;
      /* 1. kirim penghapusan yang tertunda */
      var jobs = Object.keys(tomb.p).map(function (id) { return removeRemote(uref().collection('projects').doc(id)); })
        .concat(Object.keys(tomb.t).map(function (id) { return uref().collection('templates').doc(id).set({ dihapus: true, diubah: Date.now() }); }));
      return Promise.all(jobs);
    }).then(function () {
      return clearTomb(tomb);
    }).then(function () {
      return uref().collection('projects').get();
    }).then(function (snap) {
      var seen = {}, jobs = [];
      snap.docs.forEach(function (d) {
        var r = d.data(), l = H.getProject(d.id); seen[d.id] = 1;
        if (r.dihapus) { if (l && (l.diubah || 0) <= r.diubah) jobs.push(H.removeProject(d.id)); else if (l) jobs.push(pushProject(l)); }
        else if (!l || r.diubah > (l.diubah || 0)) jobs.push(pullProject(d));
        else if ((l.diubah || 0) > r.diubah) jobs.push(pushProject(l));
        else if ((l.versi || []).some(function (v) { return !v.syncedAt; })) jobs.push(pushProject(l));
      });
      H.listProjects().forEach(function (p) { if (!seen[p.id]) jobs.push(pushProject(p)); });
      return Promise.all(jobs);
    }).then(function () {
      return uref().collection('templates').get();
    }).then(function (snap) {
      var seen = {}, jobs = [];
      snap.docs.forEach(function (d) {
        var r = d.data(), l = H.getTemplate(d.id); seen[d.id] = 1; r.id = d.id;
        if (r.dihapus) { if (l && (l.diubah || 0) <= r.diubah) jobs.push(H.removeTemplate(d.id)); }
        else if (!l || r.diubah > (l.diubah || 0)) jobs.push(H.applyTemplate(r));
        else if ((l.diubah || 0) > r.diubah) jobs.push(uref().collection('templates').doc(l.id).set(clean(l)));
      });
      H.listTemplates().forEach(function (t) { if (!seen[t.id]) jobs.push(uref().collection('templates').doc(t.id).set(clean(t))); });
      return Promise.all(jobs);
    }).then(function () {
      busy = false; setState({ status: 'tersinkron', last: Date.now() }); Store.setMeta('lastSync', Date.now());
      if (again) { again = false; return fullSync(); }
    }, function (e) {
      busy = false; again = false;
      setState({ status: navigator.onLine === false ? 'offline' : 'gagal', error: (e && e.message) || String(e) });
    });
  }

  var Sync = {
    aktif: function () { var c = window.FIREBASE_CONFIG; return !!(c && c.apiKey && c.projectId); },
    state: state,
    start: function (hooks) {
      H = hooks;
      if (!Sync.aktif()) { setState({ status: 'mati' }); return Promise.resolve(); }
      setState({ status: 'memuat' });
      var ready = window.firebase ? Promise.resolve() :
        loadScript(SDK + 'firebase-app-compat.js').then(function () { return loadScript(SDK + 'firebase-auth-compat.js'); }).then(function () { return loadScript(SDK + 'firebase-firestore-compat.js'); });
      return ready.then(function () {
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
        fb.auth = firebase.auth(); fb.fs = firebase.firestore();
        try { fb.auth.getRedirectResult().catch(function () {}); } catch (e) {}
        fb.auth.onAuthStateChanged(function (u) {
          fb.user = u || null;
          if (u) { setState({ status: 'menyinkron', email: u.email || '' }); fullSync(); }
          else setState({ status: 'keluar', email: '' });
        });
        window.addEventListener('online', function () { if (fb.user) fullSync(); });
      }, function (e) { setState({ status: 'gagal', error: e.message }); });
    },
    login: function () {
      if (!fb.auth) return Promise.reject(new Error('Firebase belum siap'));
      var prov = new firebase.auth.GoogleAuthProvider();
      return fb.auth.signInWithPopup(prov).catch(function (e) {
        if (e && /popup|operation-not-supported|cancelled-popup/.test(e.code || '')) return fb.auth.signInWithRedirect(prov);
        throw e;
      });
    },
    logout: function () { return fb.auth ? fb.auth.signOut() : Promise.resolve(); },
    syncNow: function () { return fullSync(); },
    /* dipanggil setiap ada perubahan lokal: hanya kirim yang berubah */
    changed: function (kind, id) {
      if (kind && id) pending[kind + ':' + id] = [kind, id];
      if (!fb.user) return;
      clearTimeout(pushTimer); pushTimer = setTimeout(pushPending, 2500);
    },
    deleted: function (kind, id) { return addTomb(kind, id).then(function () { Sync.changed(); }); }
  };

  window.Store = Store; window.Sync = Sync;
})();
