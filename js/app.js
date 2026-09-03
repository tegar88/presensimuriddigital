/**
 * App Core — Router, Auth, UI helpers.
 */
const App = (function() {

  let currentPage = null;
  let refreshTimer = null;

  // ============ INIT ============
  function init() {
    setupLogin();
    setupSidebar();
    setupModal();
    setupRouter();
    startClock();
    checkAuth();
  }

  function checkAuth() {
    if (API.isAuth()) {
      showApp();
    } else {
      showLogin();
    }
  }

  // ============ AUTH ============
  function setupLogin() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const secret = document.getElementById('loginSecret').value.trim();
      const role = document.getElementById('loginRole').value;
      if (!secret) return;
      API.setSession(secret, role);
      showApp();
      toast('Login berhasil', 'success');
    });
  }

  function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('schoolName').textContent = APP_CONFIG.SCHOOL_NAME;
    const session = API.getSession();
    document.getElementById('userRole').textContent = session?.role || 'ADMIN';
    applyRolePermissions(session?.role || 'ADMIN');
    handleRoute();
  }

  function applyRolePermissions(role) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const allowed = (item.dataset.role || '').split(',');
      item.style.display = allowed.includes(role) ? '' : 'none';
    });
  }

  function setupSidebar() {
    document.getElementById('btnLogout').addEventListener('click', () => {
      if (confirm('Keluar dari sistem?')) {
        API.clearSession();
        stopRefresh();
        showLogin();
        toast('Anda telah keluar', 'info');
      }
    });
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    // Close sidebar saat klik nav di mobile
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('open');
        }
      });
    });
  }

  // ============ ROUTER ============
  function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    const page = hash.replace('#/', '') || 'dashboard';
    navigateTo(page);
  }

  function navigateTo(page) {
    stopRefresh();
    currentPage = page;

    // Update nav active
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const titles = {
      dashboard: 'Dashboard',
      live: 'Live Attendance',
      manual: 'Presensi Manual',
      permissions: 'Pengajuan Izin',
      verify: 'Verifikasi Izin',
      students: 'Data Siswa',
      cards: 'Kartu RFID',
      reports: 'Rekap Kehadiran',
      devices: 'Monitoring Device',
      config: 'Konfigurasi'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    const loaders = {
      dashboard: Dashboard.render,
      live: Attendance.renderLive,
      manual: Attendance.renderManual,
      permissions: Permissions.renderForm,
      verify: Permissions.renderVerify,
      students: Students.render,
      cards: Cards.render,
      reports: Reports.render,
      devices: Devices.render,
      config: Devices.renderConfig
    };

    const loader = loaders[page];
    if (loader) {
      try { loader(); }
      catch (err) {
        content.innerHTML = `<div class="card"><p style="color:var(--danger)">Error: ${err.message}</p></div>`;
      }
    } else {
      content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚧</div><div>Halaman belum tersedia</div></div>';
    }
  }

  // ============ CLOCK ============
  function startClock() {
    const el = document.getElementById('clock');
    const update = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    };
    update();
    setInterval(update, 1000);
  }

  // ============ REFRESH TIMER ============
  function startRefresh(fn, interval = APP_CONFIG.REFRESH_INTERVAL) {
    stopRefresh();
    fn();
    refreshTimer = setInterval(fn, interval);
  }
  function stopRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  // ============ MODAL ============
  function setupModal() {
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
  }

  function openModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
  }

  // ============ TOAST ============
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = '0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ============ HELPERS ============
  function statusBadge(status) {
    const s = String(status || '').toUpperCase();
    const map = {
      HADIR: 'badge-hadir', TERLAMBAT: 'badge-terlambat',
      IZIN: 'badge-izin', SAKIT: 'badge-sakit',
      DISPENSASI: 'badge-dispensasi', ALPA: 'badge-alpa',
      MENUNGGU: 'badge-menunggu', DISETUJUI: 'badge-disetujui', DITOLAK: 'badge-ditolak',
      AKTIF: 'badge-aktif', NONAKTIF: 'badge-nonaktif'
    };
    return `<span class="badge ${map[s] || ''}">${s}</span>`;
  }

  function onlineBadge(online) {
    return online
      ? '<span class="badge badge-online">● ONLINE</span>'
      : '<span class="badge badge-offline">● OFFLINE</span>';
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function exportCSV(filename, rows) {
    if (!rows.length) { toast('Tidak ada data untuk diexport', 'warning'); return; }
    const csv = rows.map(r =>
      r.map(c => {
        const s = String(c ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV berhasil diunduh', 'success');
  }

  return {
    init, navigateTo, toast, openModal, closeModal,
    statusBadge, onlineBadge, escapeHTML, exportCSV,
    startRefresh, stopRefresh
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
