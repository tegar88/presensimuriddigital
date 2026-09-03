const Dashboard = (function() {

  async function render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="stats-grid" id="statsGrid">
        ${Array(7).fill('<div class="stat-card"><div class="stat-value">-</div></div>').join('')}
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">📡 Aktivitas Terbaru</div>
          <button class="btn btn-sm btn-secondary" id="btnRefreshDash">🔄 Refresh</button>
        </div>
        <div class="live-feed" id="dashFeed">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    document.getElementById('btnRefreshDash').addEventListener('click', loadData);
    loadData();
    App.startRefresh(loadData, APP_CONFIG.REFRESH_INTERVAL);
  }

  async function loadData() {
    try {
      const data = await API.request('get_summary');
      renderStats(data);
      renderFeed(data.recent || []);
    } catch (err) {
      document.getElementById('dashFeed').innerHTML =
        `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div>${App.escapeHTML(err.message)}</div></div>`;
    }
  }

  function renderStats(data) {
    const c = data.counts || {};
    const stats = [
      { label: 'Total Siswa', value: data.totalSiswa, cls: 'info', sub: 'siswa aktif' },
      { label: 'Sudah Absen', value: data.sudahAbsen, cls: 'success', sub: `dari ${data.totalSiswa}` },
      { label: 'Belum Absen', value: data.belumAbsen, cls: 'warning', sub: 'perlu dicek' },
      { label: 'Hadir', value: c.HADIR || 0, cls: 'success' },
      { label: 'Terlambat', value: c.TERLAMBAT || 0, cls: 'warning' },
      { label: 'Izin/Sakit', value: (c.IZIN||0) + (c.SAKIT||0) + (c.DISPENSASI||0), cls: 'info' },
      { label: 'Alpa', value: c.ALPA || 0, cls: 'danger' }
    ];
    document.getElementById('statsGrid').innerHTML = stats.map(s => `
      <div class="stat-card ${s.cls}">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value ?? 0}</div>
        ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
      </div>
    `).join('');
  }

  function renderFeed(items) {
    const feed = document.getElementById('dashFeed');
    if (!items.length) {
      feed.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Belum ada presensi hari ini</div></div>';
      return;
    }
    feed.innerHTML = items.map(it => `
      <div class="feed-item">
        <div class="feed-time">${App.escapeHTML(it.jamMasuk || '-')}</div>
        <div class="feed-info">
          <div class="feed-name">${App.escapeHTML(it.nama)}</div>
          <div class="feed-meta">NIS ${App.escapeHTML(it.nis)} • ${App.escapeHTML(it.kelas)}</div>
        </div>
        ${App.statusBadge(it.status)}
      </div>
    `).join('');
  }

  return { render };
})();
