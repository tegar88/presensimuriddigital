const Attendance = (function() {

  // ===== LIVE ATTENDANCE =====
  function renderLive() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Live Attendance — Real-time Feed</div>
          <div style="display:flex;gap:8px">
            <span class="badge badge-online">● LIVE</span>
            <button class="btn btn-sm btn-secondary" id="btnRefreshLive">🔄</button>
          </div>
        </div>
        <div class="live-feed" id="liveFeed">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    document.getElementById('btnRefreshLive').addEventListener('click', loadLive);
    loadLive();
    App.startRefresh(loadLive, 5000); // 5 detik untuk live
  }

  async function loadLive() {
    try {
      const data = await API.request('get_today_attendance');
      const feed = document.getElementById('liveFeed');
      if (!data.data || !data.data.length) {
        feed.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Belum ada presensi hari ini</div></div>';
        return;
      }
      feed.innerHTML = data.data.slice().reverse().map(it => `
        <div class="feed-item">
          <div class="feed-time">${App.escapeHTML(it.jamMasuk)}</div>
          <div class="feed-info">
            <div class="feed-name">${App.escapeHTML(it.nama)}</div>
            <div class="feed-meta">NIS ${App.escapeHTML(it.nis)} • ${App.escapeHTML(it.kelas)} • ${App.escapeHTML(it.metode)}</div>
          </div>
          ${App.statusBadge(it.status)}
        </div>
      `).join('');
    } catch (err) {
      document.getElementById('liveFeed').innerHTML =
        `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div>${App.escapeHTML(err.message)}</div></div>`;
    }
  }

  // ===== PRESENSI MANUAL =====
  function renderManual() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">✍️ Presensi Manual</div>
          <div class="card-sub" style="font-size:12px;color:var(--text-muted)">Untuk siswa yang lupa membawa kartu</div>
        </div>
        <form id="manualForm">
          <div class="form-group">
            <label>Kelas</label>
            <select class="form-control" id="mKelas" required>
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
          <div class="form-group">
            <label>Siswa</label>
            <select class="form-control" id="mSiswa" required disabled>
              <option value="">-- Pilih Siswa --</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select class="form-control" id="mStatus" required>
                <option value="HADIR">HADIR</option>
                <option value="TERLAMBAT">TERLAMBAT</option>
                <option value="IZIN">IZIN</option>
                <option value="SAKIT">SAKIT</option>
                <option value="DISPENSASI">DISPENSASI</option>
                <option value="ALPA">ALPA</option>
              </select>
            </div>
            <div class="form-group">
              <label>Verifikator (Nama Guru)</label>
              <input type="text" class="form-control" id="mVerif" required placeholder="Nama Anda" />
            </div>
          </div>
          <div class="form-group">
            <label>Keterangan</label>
            <textarea class="form-control" id="mKet" placeholder="Contoh: Kartu tertinggal"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">💾 Simpan Presensi</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 Presensi Manual Hari Ini</div>
        </div>
        <div id="manualList"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;

    loadKelasOptions();
    document.getElementById('mKelas').addEventListener('change', onKelasChange);
    document.getElementById('manualForm').addEventListener('submit', submitManual);
    loadManualToday();
  }

  async function loadKelasOptions() {
    try {
      const res = await API.request('get_students', {});
      const kelasSet = new Set((res.data || []).map(s => s.kelas).filter(Boolean));
      const select = document.getElementById('mKelas');
      [...kelasSet].sort().forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        select.appendChild(opt);
      });
    } catch (err) { App.toast(err.message, 'error'); }
  }

  let _allStudents = [];
  async function onKelasChange(e) {
    const kelas = e.target.value;
    const select = document.getElementById('mSiswa');
    select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
    select.disabled = !kelas;
    if (!kelas) return;
    try {
      const res = await API.request('get_students', { kelas, status: 'AKTIF' });
      _allStudents = res.data || [];
      _allStudents.sort((a,b) => a.nama.localeCompare(b.nama));
      _allStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nis;
        opt.textContent = `${s.nama} (NIS ${s.nis})`;
        select.appendChild(opt);
      });
    } catch (err) { App.toast(err.message, 'error'); }
  }

  async function submitManual(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
    try {
      await API.request('manual_attendance', {
        nis: document.getElementById('mSiswa').value,
        status: document.getElementById('mStatus').value,
        keterangan: document.getElementById('mKet').value,
        verifikator: document.getElementById('mVerif').value
      });
      App.toast('Presensi manual berhasil disimpan', 'success');
      e.target.reset();
      document.getElementById('mSiswa').disabled = true;
      loadManualToday();
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '💾 Simpan Presensi';
    }
  }

  async function loadManualToday() {
    try {
      const res = await API.request('get_today_attendance');
      const manual = (res.data || []).filter(x => x.metode === 'GURU' || x.metode === 'WEB');
      const el = document.getElementById('manualList');
      if (!manual.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Belum ada presensi manual hari ini</div></div>';
        return;
      }
      el.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>Jam</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Status</th></tr></thead>
          <tbody>${manual.map(m => `
            <tr>
              <td>${App.escapeHTML(m.jamMasuk)}</td>
              <td>${App.escapeHTML(m.nis)}</td>
              <td>${App.escapeHTML(m.nama)}</td>
              <td>${App.escapeHTML(m.kelas)}</td>
              <td>${App.statusBadge(m.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (err) {
      document.getElementById('manualList').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  return { renderLive, renderManual };
})();
