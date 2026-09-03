const Permissions = (function() {

  // ===== FORM PENGAJUAN IZIN =====
  function renderForm() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📝 Pengajuan Izin / Sakit / Dispensasi</div>
        </div>
        <form id="formIzin">
          <div class="form-group">
            <label>NIS Siswa *</label>
            <input class="form-control" name="nis" required placeholder="1001" />
          </div>
          <div class="form-group">
            <label>Jenis *</label>
            <select class="form-control" name="jenis" required>
              <option value="IZIN">IZIN</option>
              <option value="SAKIT">SAKIT</option>
              <option value="DISPENSASI">DISPENSASI</option>
            </select>
          </div>
          <div class="form-group">
            <label>Alasan *</label>
            <textarea class="form-control" name="alasan" required placeholder="Jelaskan alasan..."></textarea>
          </div>
          <div class="form-group">
            <label>Pengaju (Ortu/Wali/Siswa)</label>
            <input class="form-control" name="pengaju" placeholder="Nama pengaju" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">📤 Kirim Pengajuan</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">📋 Riwayat Pengajuan Anda</div></div>
        <div id="izinList"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;
    document.getElementById('formIzin').addEventListener('submit', submitIzin);
    loadIzinList();
  }

  async function submitIzin(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await API.request('permission_create', Object.fromEntries(fd));
      App.toast('Pengajuan terkirim, menunggu verifikasi guru', 'success');
      e.target.reset();
      loadIzinList();
    } catch (err) { App.toast(err.message, 'error'); }
    finally { btn.disabled = false; }
  }

  async function loadIzinList() {
    try {
      const res = await API.request('permission_list', {});
      const el = document.getElementById('izinList');
      const data = res.data || [];
      if (!data.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Belum ada pengajuan</div></div>';
        return;
      }
      el.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>Tanggal</th><th>NIS</th><th>Nama</th><th>Jenis</th><th>Alasan</th><th>Status</th></tr></thead>
          <tbody>${data.slice().reverse().map(p => `
            <tr>
              <td>${App.escapeHTML(p.tanggal)}</td>
              <td>${App.escapeHTML(p.nis)}</td>
              <td>${App.escapeHTML(p.nama)}</td>
              <td>${App.escapeHTML(p.jenis)}</td>
              <td style="font-size:12px">${App.escapeHTML(p.alasan)}</td>
              <td>${App.statusBadge(p.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (err) {
      document.getElementById('izinList').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  // ===== VERIFIKASI IZIN (GURU) =====
  function renderVerify() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">✅ Verifikasi Pengajuan Izin</div>
          <select class="form-control" id="filterIzinStatus" style="max-width:200px">
            <option value="MENUNGGU">Menunggu</option>
            <option value="">Semua</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
        <div id="verifyList"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;
    document.getElementById('filterIzinStatus').addEventListener('change', loadVerify);
    loadVerify();
    App.startRefresh(loadVerify, 15000);
  }

  async function loadVerify() {
    const status = document.getElementById('filterIzinStatus').value;
    try {
      const res = await API.request('permission_list', { status: status || undefined });
      const el = document.getElementById('verifyList');
      const data = res.data || [];
      if (!data.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div>Tidak ada pengajuan</div></div>';
        return;
      }
      el.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>ID</th><th>Tanggal</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Jenis</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>${data.map(p => `
            <tr>
              <td><code style="font-size:11px">${App.escapeHTML(p.id)}</code></td>
              <td>${App.escapeHTML(p.tanggal)}</td>
              <td>${App.escapeHTML(p.nis)}</td>
              <td>${App.escapeHTML(p.nama)}</td>
              <td>${App.escapeHTML(p.kelas)}</td>
              <td>${App.escapeHTML(p.jenis)}</td>
              <td style="font-size:12px">${App.escapeHTML(p.alasan)}</td>
              <td>${App.statusBadge(p.status)}</td>
              <td>
                ${p.status === 'MENUNGGU' ? `
                  <button class="btn btn-sm btn-success" onclick="Permissions.verifyAction('${p.id}','APPROVE')">✓ Setujui</button>
                  <button class="btn btn-sm btn-danger" onclick="Permissions.verifyAction('${p.id}','REJECT')">✗ Tolak</button>
                ` : '-'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (err) {
      document.getElementById('verifyList').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  async function verifyAction(id, action) {
    const catatan = prompt(action === 'APPROVE' ? 'Catatan (opsional):' : 'Alasan penolakan:') ?? '';
    const session = API.getSession();
    try {
      await API.request('permission_verify', {
        id, action, catatan, verifikator: session?.role || 'GURU'
      });
      App.toast(action === 'APPROVE' ? 'Izin disetujui' : 'Izin ditolak', 'success');
      loadVerify();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  return { renderForm, renderVerify, verifyAction };
})();
