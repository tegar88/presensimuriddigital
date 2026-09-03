const Reports = (function() {

  function render() {
    const content = document.getElementById('pageContent');
    const today = new Date().toISOString().slice(0,10);
    const monthAgo = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📈 Rekap Kehadiran</div>
        </div>
        <div class="toolbar">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Dari</label>
            <input type="date" class="form-control" id="rDari" value="${monthAgo}" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Sampai</label>
            <input type="date" class="form-control" id="rSampai" value="${today}" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Kelas</label>
            <select class="form-control" id="rKelas"><option value="">Semua</option></select>
          </div>
          <div style="align-self:flex-end;display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" id="btnLoadRekap">🔍 Tampilkan</button>
            <button class="btn btn-secondary btn-sm" id="btnExportRekap">📥 Export CSV</button>
            <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print</button>
          </div>
        </div>
        <div id="rekapResult"><div class="empty-state"><div class="empty-state-icon">📊</div><div>Klik "Tampilkan" untuk melihat rekap</div></div></div>
      </div>
    `;
    document.getElementById('btnLoadRekap').addEventListener('click', loadRekap);
    document.getElementById('btnExportRekap').addEventListener('click', exportRekap);
    loadKelasFilter();
  }

  async function loadKelasFilter() {
    try {
      const res = await API.request('get_students', {});
      const kelasSet = new Set((res.data || []).map(s => s.kelas).filter(Boolean));
      const select = document.getElementById('rKelas');
      [...kelasSet].sort().forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        select.appendChild(opt);
      });
    } catch {}
  }

  let _rekapData = [];
  async function loadRekap() {
    const payload = {
      dari: document.getElementById('rDari').value,
      sampai: document.getElementById('rSampai').value,
      kelas: document.getElementById('rKelas').value || undefined
    };
    const el = document.getElementById('rekapResult');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const res = await API.request('get_rekap', payload);
      _rekapData = res.data || [];
      renderRekap(_rekapData);
    } catch (err) {
      el.innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  function renderRekap(data) {
    const el = document.getElementById('rekapResult');
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Tidak ada data</div></div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>NIS</th><th>Nama</th><th>Kelas</th>
          <th style="text-align:center">H</th><th style="text-align:center">T</th>
          <th style="text-align:center">I</th><th style="text-align:center">S</th>
          <th style="text-align:center">D</th><th style="text-align:center">A</th>
          <th>% Hadir</th>
        </tr></thead>
        <tbody>${data.map(r => `
          <tr>
            <td>${App.escapeHTML(r.nis)}</td>
            <td>${App.escapeHTML(r.nama)}</td>
            <td>${App.escapeHTML(r.kelas)}</td>
            <td style="text-align:center;color:var(--success);font-weight:600">${r.HADIR}</td>
            <td style="text-align:center;color:var(--warning);font-weight:600">${r.TERLAMBAT}</td>
            <td style="text-align:center">${r.IZIN}</td>
            <td style="text-align:center">${r.SAKIT}</td>
            <td style="text-align:center">${r.DISPENSASI}</td>
            <td style="text-align:center;color:var(--danger);font-weight:600">${r.ALPA}</td>
            <td><strong>${r.persentase}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  function exportRekap() {
    if (!_rekapData.length) { App.toast('Tidak ada data', 'warning'); return; }
    const rows = [['NIS','Nama','Kelas','Hadir','Terlambat','Izin','Sakit','Dispensasi','Alpa','% Kehadiran']];
    _rekapData.forEach(r => rows.push([
      r.nis, r.nama, r.kelas, r.HADIR, r.TERLAMBAT, r.IZIN, r.SAKIT, r.DISPENSASI, r.ALPA, r.persentase
    ]));
    App.exportCSV(`rekap_${new Date().toISOString().slice(0,10)}.csv`, rows);
  }

  return { render };
})();
