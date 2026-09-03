const Devices = (function() {

  function render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📟 Monitoring Device IoT</div>
          <button class="btn btn-sm btn-secondary" id="btnRefreshDev">🔄 Refresh</button>
        </div>
        <div id="deviceList"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;
    document.getElementById('btnRefreshDev').addEventListener('click', loadDevices);
    loadDevices();
    App.startRefresh(loadDevices, 20000);
  }

  async function loadDevices() {
    try {
      const res = await API.request('device_list');
      const el = document.getElementById('deviceList');
      const data = res.data || [];
      if (!data.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📟</div><div>Belum ada device terdaftar</div></div>';
        return;
      }
      el.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>Device ID</th><th>Nama</th><th>Lokasi</th><th>Status</th><th>Last Seen</th><th>Koneksi</th></tr></thead>
          <tbody>${data.map(d => `
            <tr>
              <td><code>${App.escapeHTML(d.deviceId)}</code></td>
              <td>${App.escapeHTML(d.nama)}</td>
              <td>${App.escapeHTML(d.lokasi)}</td>
              <td>${App.statusBadge(d.status)}</td>
              <td>${App.escapeHTML(d.lastSeen || '-')}</td>
              <td>${App.onlineBadge(d.online)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (err) {
      document.getElementById('deviceList').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  // ===== KONFIGURASI SISTEM =====
  function renderConfig() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">⚙️ Konfigurasi Sistem</div></div>
        <div id="configForm"><div class="loading"><div class="spinner"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🔐 Informasi Keamanan</div></div>
        <ul style="padding-left:20px;color:var(--text-muted);font-size:13px;line-height:1.8">
          <li>Secret API disimpan di sheet CONFIG → <code>secret_api</code></li>
          <li>Secret device disimpan di sheet DEVICE → <code>SecretKey</code></li>
          <li>Semua aksi dicatat di sheet LOG_EVENT (audit trail)</li>
          <li>Session admin disimpan di localStorage browser Anda</li>
          <li>Jangan bagikan secret kepada pihak yang tidak berwenang</li>
        </ul>
      </div>
    `;
    loadConfig();
  }

  async function loadConfig() {
    try {
      const res = await API.request('get_config');
      const cfg = res.config || {};
      const el = document.getElementById('configForm');
      el.innerHTML = `
        <form id="formConfig">
          <div class="form-row">
            <div class="form-group"><label>Nama Sekolah</label><input class="form-control" value="${App.escapeHTML(cfg.nama_sekolah||'')}" disabled /></div>
            <div class="form-group"><label>Timezone</label><input class="form-control" value="${App.escapeHTML(cfg.timezone||'')}" disabled /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Jam Masuk</label><input class="form-control" value="${App.escapeHTML(cfg.jam_masuk||'')}" disabled /></div>
            <div class="form-group"><label>Batas Terlambat</label><input class="form-control" value="${App.escapeHTML(cfg.batas_terlambat||'')}" disabled /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Sistem Aktif</label><input class="form-control" value="${App.escapeHTML(cfg.sistem_aktif||'')}" disabled /></div>
            <div class="form-group"><label>Hari Efektif</label><input class="form-control" value="${App.escapeHTML(cfg.hari_mulai||'')} - ${App.escapeHTML(cfg.hari_selesai||'')}" disabled /></div>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
            💡 Untuk mengubah konfigurasi, edit langsung di sheet <strong>CONFIG</strong> pada Google Spreadsheet.
          </p>
        </form>`;
    } catch (err) {
      document.getElementById('configForm').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  return { render, renderConfig };
})();
