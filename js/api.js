/**
 * API Wrapper — semua komunikasi dengan Apps Script backend.
 */
const API = (function() {

  async function request(action, payload = {}, options = {}) {
    const url = APP_CONFIG.API_URL;
    if (!url || url.includes('XXXXXXXX')) {
      throw new Error('API_URL belum dikonfigurasi di config.js');
    }

    const body = { action, ...payload };
    // Inject admin_secret dari session jika ada
    const session = getSession();
    if (session && session.secret) {
      body.admin_secret = session.secret;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!data.success && !options.ignoreError) {
        const err = new Error(data.message || 'Request gagal');
        err.result = data.result;
        err.data = data;
        throw err;
      }
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timeout. Periksa koneksi internet.');
      }
      throw err;
    }
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(APP_CONFIG.SESSION_KEY) || 'null');
    } catch { return null; }
  }

  function setSession(secret, role) {
    localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify({
      secret, role, loginAt: Date.now()
    }));
  }

  function clearSession() {
    localStorage.removeItem(APP_CONFIG.SESSION_KEY);
  }

  function isAuth() {
    return !!getSession();
  }

  return { request, getSession, setSession, clearSession, isAuth };
})();
