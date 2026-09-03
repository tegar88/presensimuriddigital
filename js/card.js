const Cards = (function() {

  function render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">💳 Manajemen Kartu RFID</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" id="btnRegCard">+ Daftarkan Kartu</button>
            <button class="btn btn-warning btn-sm" id="btnReplaceCard">🔄 Ganti Kartu</button>
          </div>
        </div>
        <div class="toolbar">
          <input type="text" class="form-control" id="searchCard" placeholder="🔍 Cari UID / NIS / Nama..." />
          <select class="form-control" id="filterCardStatus">
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Nonaktif</option>
            <option value="HILANG">Hilang</option>
            <option value="RUSAK">Rusak</option>
            <option value="DIGANTI">Diganti</option>
          </select>
        </div>
        <div id="cardTable"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;
    document.getElementById('btnRegCard').addEventListener('click', showRegister);
    document.getElementById('btnReplaceCard').addEventListener('click', showReplace);
    document.getElementById('searchCard').addEventListener('input', debounce(loadCards, 300));
    document.getElementById('filterCardStatus').addEventListener('change', loadCards);
    loadCards();
  }

  let _cache = [];
  async function loadCards() {
    const q = (document.getElementById('searchCard').value || '').toLowerCase();
    const status = document.getElementById('filterCardStatus').value;
    try {
      const res = await API.request('card_list', { status: status || undefined });
      _cache = (res.data || []).filter(c => {
        if (!q) return true;
        return (c.uid||'').toLowerCase().includes(q) ||
               String(c.nis).includes(q) ||
               (c.nama||'').toLowerCase().includes(q);
      });
      renderTable(_cache);
    } catch (err) {
      document.getElementById('cardTable').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  function renderTable(data) {
    const el = document.getElementById('cardTable');
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💳</div><div>Tidak ada kartu</div></div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr><th>UID</th><th>NIS</th><th>Nama</th><th>Tgl Aktif</th><th>Status</th><th>Keterangan</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(c => `
          <tr>
            <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${App.escapeHTML(c.uid)}</code></td>
            <td>${App.escapeHTML(c.nis)}</td>
            <td>${App.escapeHTML(c.nama)}</td>
            <td>${App.escapeHTML(c.tglAktif || '-')}</td>
            <td>${App.statusBadge(c.status)}</td>
            <td style="font-size:12px;color:var(--text-muted)">${App.escapeHTML(c.keterangan || '-')}</td>
            <td>
              ${c.status === 'AKTIF' ? `
                <button class="btn btn-sm btn-danger" onclick="Cards.disable('${c.uid}')">🚫 Nonaktifkan</button>
              ` : '-'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  function showRegister() {
    App.openModal('Daftarkan Kartu Baru', `
      <form id="formRegCard">
        <div class="form-group">
          <label>UID Kartu *</label>
          <input class="form-control" name="uid" required placeholder="A1B2C3D4" style="font-family:monospace;text-transform:uppercase" />
          <small style="color:var(--text-muted)">Tempelkan kartu ke reader untuk melihat UID, atau ketik manual</small>
        </div>
        <div class="form-group">
          <label>NIS Siswa *</label>
          <input class="form-control" name="nis" required placeholder="1001" />
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <input class="form-control" name="keterangan" placeholder="Kartu utama" />
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="Cards.submitRegister()">💾 Daftarkan</button>
    `);
  }

  async function submitRegister() {
    const fd = new FormData(document.getElementById('formRegCard'));
    try {
      await API.request('card_register', Object.fromEntries(fd));
      App.toast('Kartu didaftarkan', 'success');
      App.closeModal();
      loadCards();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  function showReplace() {
    App.openModal('Ganti Kartu (Hilang/Rusak)', `
      <form id="formReplaceCard">
        <div class="form-group">
          <label>UID Lama *</label>
          <input class="form-control" name="old_uid" required style="font-family:monospace;text-transform:uppercase" />
        </div>
        <div class="form-group">
          <label>UID Baru *</label>
          <input class="form-control" name="new_uid" required style="font-family:monospace;text-transform:uppercase" />
        </div>
      </form>
      <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Kartu lama akan ditandai sebagai "DIGANTI" dan histori tetap tersimpan.
      </p>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
      <button class="btn btn-warning" onclick="Cards.submitReplace()">🔄 Ganti</button>
    `);
  }

  async function submitReplace() {
    const fd = new FormData(document.getElementById('formReplaceCard'));
    try {
      await API.request('card_replace', Object.fromEntries(fd));
      App.toast('Kartu berhasil diganti', 'success');
      App.closeModal();
      loadCards();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  async function disable(uid) {
    const reason = prompt('Alasan nonaktifkan (HILANG / RUSAK / NONAKTIF):', 'HILANG');
    if (!reason) return;
    try {
      await API.request('card_disable', { uid, reason: reason.toUpperCase() });
      App.toast('Kartu dinonaktifkan', 'success');
      loadCards();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  function debounce(fn, delay) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  return { render, disable, submitRegister, submitReplace };
})();
