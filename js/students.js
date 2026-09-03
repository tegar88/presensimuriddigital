const Students = (function() {

  function render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">👥 Data Siswa</div>
          <button class="btn btn-primary btn-sm" id="btnAddStudent">+ Tambah Siswa</button>
        </div>
        <div class="toolbar">
          <input type="text" class="form-control" id="searchSiswa" placeholder="🔍 Cari nama / NIS..." />
          <select class="form-control" id="filterKelas"><option value="">Semua Kelas</option></select>
          <select class="form-control" id="filterStatus">
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>
          <div class="toolbar-spacer"></div>
          <button class="btn btn-sm btn-secondary" id="btnExportSiswa">📥 Export CSV</button>
        </div>
        <div id="studentTable"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    `;
    document.getElementById('btnAddStudent').addEventListener('click', showAddForm);
    document.getElementById('searchSiswa').addEventListener('input', debounce(loadStudents, 300));
    document.getElementById('filterKelas').addEventListener('change', loadStudents);
    document.getElementById('filterStatus').addEventListener('change', loadStudents);
    document.getElementById('btnExportSiswa').addEventListener('click', exportStudents);
    loadStudents();
    loadKelasFilter();
  }

  let _cache = [];
  async function loadStudents() {
    const search = document.getElementById('searchSiswa').value;
    const kelas = document.getElementById('filterKelas').value;
    const status = document.getElementById('filterStatus').value;
    try {
      const res = await API.request('get_students', { search, kelas, status });
      _cache = res.data || [];
      renderTable(_cache);
    } catch (err) {
      document.getElementById('studentTable').innerHTML = `<p style="color:var(--danger)">${App.escapeHTML(err.message)}</p>`;
    }
  }

  function renderTable(data) {
    const el = document.getElementById('studentTable');
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Tidak ada data</div></div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>NIS</th><th>NISN</th><th>Nama</th><th>L/P</th><th>Kelas</th><th>Status</th><th>Aksi</th>
        </tr></thead>
        <tbody>${data.map(s => `
          <tr>
            <td><strong>${App.escapeHTML(s.nis)}</strong></td>
            <td>${App.escapeHTML(s.nisn)}</td>
            <td>${App.escapeHTML(s.nama)}</td>
            <td>${App.escapeHTML(s.jk)}</td>
            <td>${App.escapeHTML(s.kelas)}</td>
            <td>${App.statusBadge(s.status)}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="Students.showEdit('${s.nis}')">✏️</button>
              <button class="btn btn-sm btn-warning" onclick="Students.toggleStatus('${s.nis}','${s.status}')">
                ${s.status === 'AKTIF' ? '🔒' : '🔓'}
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  async function loadKelasFilter() {
    try {
      const res = await API.request('get_students', {});
      const kelasSet = new Set((res.data || []).map(s => s.kelas).filter(Boolean));
      const select = document.getElementById('filterKelas');
      [...kelasSet].sort().forEach(k => {
        const opt = document.createElement('option');
        opt.value = k; opt.textContent = k;
        select.appendChild(opt);
      });
    } catch {}
  }

  function showAddForm() {
    App.openModal('Tambah Siswa', `
      <form id="formAddSiswa">
        <div class="form-row">
          <div class="form-group"><label>NIS *</label><input class="form-control" name="nis" required /></div>
          <div class="form-group"><label>NISN</label><input class="form-control" name="nisn" /></div>
        </div>
        <div class="form-group"><label>Nama Lengkap *</label><input class="form-control" name="nama" required /></div>
        <div class="form-row">
          <div class="form-group">
            <label>Jenis Kelamin</label>
            <select class="form-control" name="jk"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
          </div>
          <div class="form-group"><label>Kelas *</label><input class="form-control" name="kelas" required placeholder="VIII-A" /></div>
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="Students.submitAdd()">💾 Simpan</button>
    `);
  }

  async function submitAdd() {
    const form = document.getElementById('formAddSiswa');
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd);
    try {
      await API.request('student_create', payload);
      App.toast('Siswa ditambahkan', 'success');
      App.closeModal();
      loadStudents();
      loadKelasFilter();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  function showEdit(nis) {
    const s = _cache.find(x => String(x.nis) === String(nis));
    if (!s) return;
    App.openModal('Edit Siswa', `
      <form id="formEditSiswa">
        <div class="form-group"><label>NIS</label><input class="form-control" value="${App.escapeHTML(s.nis)}" disabled /></div>
        <div class="form-group"><label>Nama</label><input class="form-control" name="nama" value="${App.escapeHTML(s.nama)}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Kelas</label><input class="form-control" name="kelas" value="${App.escapeHTML(s.kelas)}" /></div>
          <div class="form-group"><label>Rombel</label><input class="form-control" name="rombel" value="${App.escapeHTML(s.rombel || s.kelas)}" /></div>
        </div>
      </form>
    `, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="Students.submitEdit('${nis}')">💾 Simpan</button>
    `);
  }

  async function submitEdit(nis) {
    const form = document.getElementById('formEditSiswa');
    const fd = new FormData(form);
    const payload = { nis, ...Object.fromEntries(fd) };
    try {
      await API.request('student_update', payload);
      App.toast('Siswa diperbarui', 'success');
      App.closeModal();
      loadStudents();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  async function toggleStatus(nis, current) {
    const newStatus = current === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    if (!confirm(`Ubah status siswa NIS ${nis} menjadi ${newStatus}?`)) return;
    try {
      await API.request('student_set_status', { nis, status: newStatus });
      App.toast('Status diubah', 'success');
      loadStudents();
    } catch (err) { App.toast(err.message, 'error'); }
  }

  async function exportStudents() {
    try {
      const res = await API.request('get_students', {});
      const rows = [['NIS','NISN','Nama','JK','Kelas','Rombel','Status']];
      (res.data || []).forEach(s => rows.push([s.nis, s.nisn, s.nama, s.jk, s.kelas, s.rombel, s.status]));
      App.exportCSV(`siswa_${new Date().toISOString().slice(0,10)}.csv`, rows);
    } catch (err) { App.toast(err.message, 'error'); }
  }

  function debounce(fn, delay) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  return { render, showEdit, submitAdd, submitEdit, toggleStatus };
})();
