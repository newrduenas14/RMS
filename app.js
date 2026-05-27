/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   AUTH, USERS & NAVIGATION \u2014 modular version
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
const P = 7, L = 2, SF = 1.20;
let allProducts = [];
let currentFilter = 'all';
let currentRole = 'ops';
let currentCashUser = 'Recepci\u00F3n';
let currentUser = null;
let currentPermissions = { modules: {}, tabs: {} };

const HMS_SESSION_KEY = 'hms_current_session_v1';
const HMS_LAST_SCREEN_KEY = 'hms_last_screen_v1';
const HMS_REV_TAB_KEY = 'hms_revenue_tab_v1';
const HMS_REV_SUBTAB_KEY = 'hms_revenue_subtab_v1';

const MODULES = [
  { key:'home', label:'Inicio', icon:'IN', desc:'Resumen inicial del sistema.' },
  { key:'inventory', label:'Inventario', icon:'INV', desc:'Stock, compras, usos y desayunos.' },
  { key:'maintenance', label:'Mantenimiento', icon:'MAN', desc:'Servicios, fechas y registros.' },
  { key:'cash', label:'Caja', icon:'CAJ', desc:'Caja diaria, cierres y banco registrado.' },
  { key:'revenue', label:'Ingresos / RMS', icon:'RMS', desc:'KPIs, forecast, tarifas y aprobaci\u00F3n.' },
  { key:'users', label:'Usuarios', icon:'USR', desc:'Crear usuarios y asignar permisos.', adminOnly:true }
];

const MODULE_TABS = {
  inventory: ['Resumen','Detalles de productos','Capturas'],
  cash: ['Caja de hoy','Cierre del d\u00EDa','Vista finanzas'],
  revenue: ['Diario','Mensual','Anual','Aprobaci\u00F3n'],
  users: ['Usuarios y permisos']
};

function tryLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  const err = document.getElementById('login-error');
  err.textContent = '';
  if (!username || !password) {
    err.textContent = 'Ingresa usuario y contrase\u00F1a.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Validando...';
  google.script.run
    .withSuccessHandler(res => {
      btn.disabled = false;
      btn.textContent = 'Entrar al sistema';
      if (!res || !res.success) {
        err.textContent = (res && res.error) || 'Usuario o contrase\u00F1a incorrectos.';
        document.getElementById('login-password').value = '';
        return;
      }
      finishLogin(res);
    })
    .withFailureHandler(e => {
      btn.disabled = false;
      btn.textContent = 'Entrar al sistema';
      err.textContent = 'No se pudo iniciar sesi\u00F3n: ' + (e && e.message ? e.message : e);
    })
    .loginUser(username, password);
}

function finishLogin(auth, restoreScreen) {
  currentUser = auth.user;
  currentPermissions = auth.permissions || { modules:{}, tabs:{} };
  currentRole = (currentUser.role === 'admin' || currentUser.role === 'finance') ? 'finance' : 'ops';
  currentCashUser = currentUser.name || currentUser.username || 'Usuario';
  try { localStorage.setItem(HMS_SESSION_KEY, JSON.stringify({ user: currentUser, permissions: currentPermissions })); } catch(e) {}
  document.body.classList.add('app-logged-in');
  if (currentRole === 'finance') document.body.classList.add('cash-finance');
  else document.body.classList.remove('cash-finance');
  renderUserShell();
  applyTabPermissions();
  const allowed = allowedModules().filter(m => m.key !== 'home' && m.key !== 'users');
  const last = restoreScreen || localStorage.getItem(HMS_LAST_SCREEN_KEY);
  if (last && last !== 'login' && hasModuleAccess(last)) goTo(last);
  else if (allowed.length === 1 && currentUser.role !== 'admin') goTo(allowed[0].key);
  else goTo('home');
}

function logout() {
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  try { localStorage.removeItem(HMS_SESSION_KEY); localStorage.removeItem(HMS_LAST_SCREEN_KEY); localStorage.removeItem(HMS_REV_TAB_KEY); localStorage.removeItem(HMS_REV_SUBTAB_KEY); } catch(e) {}
  currentUser = null;
  currentPermissions = { modules:{}, tabs:{} };
  currentRole = 'ops';
  currentCashUser = 'Recepci\u00F3n';
  document.body.classList.remove('app-logged-in','cash-finance');
  closeSidebar();
  goTo('login', true);
}

function hasModuleAccess(key) {
  if (key === 'home') return true;
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return !!(currentPermissions.modules && currentPermissions.modules[key] && currentPermissions.modules[key].view);
}

function hasTabAccess(moduleKey, tabName) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  const key = moduleKey + '::' + tabName;
  if (!currentPermissions.tabs || !currentPermissions.tabs[key]) return true;
  return !!currentPermissions.tabs[key].view;
}

function allowedModules() {
  return MODULES.filter(m => hasModuleAccess(m.key));
}

function renderUserShell() {
  const name = currentUser.name || currentUser.username || 'Usuario';
  const role = currentUser.role || 'ops';
  const roleLabel = role === 'admin' ? 'Administrador' : (role === 'finance' ? 'Finanzas' : 'Operaci\u00F3n');
  document.getElementById('sidebar-user-name').textContent = name;
  document.getElementById('sidebar-user-role').textContent = roleLabel;
  document.getElementById('topbar-user-chip').textContent = 'Usuario: ' + name;
  document.getElementById('welcome-user-name').textContent = name;
  document.getElementById('welcome-role-chip').textContent = 'Rol: ' + roleLabel;
  document.getElementById('welcome-date-chip').textContent = new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('cash-user-fixed').value = name;
  const adminSec = document.getElementById('sidebar-admin-section');
  if (adminSec) adminSec.style.display = hasModuleAccess('users') ? '' : 'none';
  renderSidebarModules();
  renderWelcomeModules();
}

function renderSidebarModules() {
  const el = document.getElementById('sidebar-modules');
  el.innerHTML = allowedModules().filter(m => m.key !== 'users').map(m =>
    `<button class="app-sidebar-link" data-module-link="${m.key}" onclick="goTo('${m.key}')"><span class="app-sidebar-code">${m.icon}</span><span>${m.label}</span></button>`
  ).join('');
}

function renderWelcomeModules() {
  // Pantalla inicial sin cajas de modulos.
  // La navegacion de modulos vive solo en la barra lateral.
  return;
}

function openSidebar() {
  document.getElementById('app-sidebar').classList.add('active');
  document.getElementById('app-sidebar-overlay').classList.add('active');
}
function closeSidebar() {
  document.getElementById('app-sidebar').classList.remove('active');
  document.getElementById('app-sidebar-overlay').classList.remove('active');
}

function setCurrentModuleLabel(screen) {
  const mod = MODULES.find(m => m.key === screen);
  document.getElementById('app-current-module').textContent = mod ? mod.label : 'Centro de control';
  document.querySelectorAll('[data-module-link]').forEach(b => b.classList.toggle('active', b.getAttribute('data-module-link') === screen));
}

function goTo(screen, force) {
  if (!force && screen !== 'login' && !hasModuleAccess(screen)) {
    alert('No tienes acceso a este modulo.');
    return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screen);
  if (!target) return;
  target.classList.add('active');
  closeSidebar();
  setCurrentModuleLabel(screen);
  if (screen !== 'login') {
    try { localStorage.setItem(HMS_LAST_SCREEN_KEY, screen); } catch(e) {}
  }
  if (screen === 'inventory') loadInventory();
  if (screen === 'maintenance') loadMaintenance();
  if (screen === 'cash') loadCash();
  if (screen === 'revenue') {
    loadRevenue();
    restoreRevenueTabs();
  }
  if (screen === 'users') loadUsersAdmin();
}

function goToRevenue() { goTo('revenue'); }

function applyTabPermissions() {
  // Revenue tabs
  document.querySelectorAll('.rev-main-tab').forEach(btn => {
    const tab = btn.textContent.trim();
    btn.style.display = hasTabAccess('revenue', tab) ? '' : 'none';
  });
  // Cash tabs
  document.querySelectorAll('.cash-tab').forEach(btn => {
    const tab = btn.textContent.trim();
    btn.style.display = hasTabAccess('cash', tab) ? '' : 'none';
  });
  // Inventory tabs
  document.querySelectorAll('.inv-tab-btn').forEach(btn => {
    const tab = btn.textContent.trim();
    btn.style.display = hasTabAccess('inventory', tab) ? '' : 'none';
  });
}

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   TAB SWITCHERS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function revMainTab(name, btn) {
        document.querySelectorAll('.rev-main-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rev-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('revpanel-' + name).classList.add('active');
        try { localStorage.setItem(HMS_REV_TAB_KEY, name); } catch(e) {}
    }

    function revSubTab(group, name, btn) {
        const parent = btn.closest('.rev-panel');
        parent.querySelectorAll('.rev-sub-tab').forEach(b => b.classList.remove('active'));
        parent.querySelectorAll('.rev-sub-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(group + '-' + name).classList.add('active');
        try { localStorage.setItem(HMS_REV_SUBTAB_KEY + '_' + group, name); } catch(e) {}
    }

    function restoreRevenueTabs() {
        setTimeout(() => {
            const main = localStorage.getItem(HMS_REV_TAB_KEY);
            if (main) {
                const mainBtn = Array.from(document.querySelectorAll('.rev-main-tab')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + main + "'"));
                if (mainBtn && mainBtn.style.display !== 'none') revMainTab(main, mainBtn);
            }
            const group = localStorage.getItem(HMS_REV_TAB_KEY) || 'daily';
            const sub = localStorage.getItem(HMS_REV_SUBTAB_KEY + '_' + group);
            if (sub) {
                const panel = document.getElementById('revpanel-' + group);
                const subBtn = panel ? Array.from(panel.querySelectorAll('.rev-sub-tab')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + sub + "'")) : null;
                if (subBtn && subBtn.style.display !== 'none') revSubTab(group, sub, subBtn);
            }
        }, 80);
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       FORMATTERS
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function fmx(n) {
        if (n == null || isNaN(n))
            return '\u2014';
        return '$' + Number(n).toLocaleString('es-MX', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
    function fmxDec(n, d=1) {
        if (n == null || isNaN(n))
            return '\u2014';
        return Number(n).toLocaleString('es-MX', {
            minimumFractionDigits: d,
            maximumFractionDigits: d
        });
    }
    function fmxPct(n) {
        if (n == null || isNaN(n))
            return '\u2014';
        return Number(n).toFixed(1) + '%';
    }
    function monthNameFromKey(key) {
        const s = String(key || '').slice(0, 7);
        const m = /^([0-9]{4})-([0-9]{2})$/.exec(s);
        if (!m)
            return s || '\u2014';
        const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${names[Number(m[2]) - 1]} ${m[1]}`;
    }

    function channelCount(row) {
        return Number((row && (row.reservas ?? row.stays ?? row.bookings ?? 0)) || 0) || 0;
    }
    function normalizeChannelKey(v) {
        const s = String(v || '').trim().toLowerCase();
        if (!s)
            return 'otros';
        if (s.includes('book'))
            return 'booking';
        if (s.includes('expedia'))
            return 'expedia';
        if (s.includes('direct'))
            return 'direct';
        return 'otros';
    }
    function safeMonthMix(row) {
        return {
            booking: row && row.mix_booking_pct != null && row.mix_booking_pct !== '' ? Number(row.mix_booking_pct) : null,
            direct: row && row.mix_direct_pct != null && row.mix_direct_pct !== '' ? Number(row.mix_direct_pct) : null,
            expedia: row && row.mix_expedia_pct != null && row.mix_expedia_pct !== '' ? Number(row.mix_expedia_pct) : null,
            otros: row && row.mix_otros_pct != null && row.mix_otros_pct !== '' ? Number(row.mix_otros_pct) : null
        };
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       REVENUE LOADER  \u2014 real data only, no demo fallback
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    let revData = null;
    let chartOcc = null,
        chartMonthlyRev = null,
        chartMonthlyOccAdr = null,
        chartMonthlyScatter = null,
        chartYearlyOcc = null;

    function loadRevenue() {
        document.getElementById('rev-run-at').textContent = 'Cargando...';
        hideRevenueError();
        resetRevenuePanels();

        google.script.run
        .withSuccessHandler(onRevLoaded)
        .withFailureHandler(err => {
            const msg = (err && err.message) ? err.message : 'Error de conexi\u00F3n con Google Apps Script.';
            showRevenueError('ERROR AL CARGAR DATOS: ' + msg);
            document.getElementById('rev-run-at').textContent = 'Error';
        })
        .getRevenuePayloads();
    }

    function onRevLoaded(data) {
        if (!data || data._error) {
            showRevenueError('ERROR EN EL SERVIDOR: ' + ((data && data._error) ? data._error : 'Respuesta vac\u00EDa o inv\u00E1lida del RMS.'));
            document.getElementById('rev-run-at').textContent = 'Error';
            return;
        }
        hideRevenueError();
        revData = data;
        const ts = data.generated_at
        ? new Date(data.generated_at).toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short'
        })
        : 'Actualizado';
        document.getElementById('rev-run-at').textContent = ts;

        renderDaily(data);
        renderApproval(data);
        renderMonthly(data);
        renderYearly(data);
    }

    /** Resets all panels to loading state before a fresh fetch */
    function resetRevenuePanels() {
        ['kpi-adr-mes', 'kpi-revpar-mes', 'kpi-occ-mes', 'kpi-gross-mes', 'kpi-util-mes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '\u2014';
                el.className = 'rev-kpi-value';
            }
        });
        const aiText = document.getElementById('daily-ai-text');
        if (aiText)
            aiText.textContent = 'Cargando an\u00E1lisis...';
        const chMix = document.getElementById('rev-channel-mix');
        if (chMix)
            chMix.innerHTML = '<div class="rev-no-data">Cargando canales...</div>';
        const hpl = document.getElementById('high-pressure-list');
        if (hpl)
            hpl.innerHTML = '<div class="rev-no-data">Cargando...</div>';
        const rtp = document.getElementById('roomtype-performance');
        if (rtp)
            rtp.innerHTML = '<div class="rev-no-data">Cargando tipos de habitaci\u00F3n...</div>';
        const pab = document.getElementById('pricing-alerts-box');
        if (pab)
            pab.innerHTML = '<div class="rev-no-data">Cargando alertas...</div>';
        const al = document.getElementById('approval-list');
        if (al)
            al.innerHTML = '<div class="rev-no-data">Cargando tarifas...</div>';
        const mfc = document.getElementById('monthly-forecast-cards');
        if (mfc)
            mfc.innerHTML = '<div class="rev-no-data">Cargando meses 2026...</div>';
        const met = document.getElementById('monthly-exec-table');
        if (met)
            met.innerHTML = '<tr><td colspan="12" class="loading">Cargando...</td></tr>';
        const mes = document.getElementById('monthly-exec-summary');
        if (mes)
            mes.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">Cargando resumen mensual...</div>';
        const yes = document.getElementById('yearly-exec-summary');
        if (yes)
            yes.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">Cargando resumen anual...</div>';
        const yfb = document.getElementById('yearly-focus-box');
        if (yfb)
            yfb.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">Cargando...</div>';
        const ymg = document.getElementById('yearly-months-grid');
        if (ymg)
            ymg.innerHTML = '<div class="rev-no-data">Cargando proyecci\u00F3n anual...</div>';
        const ysc = document.getElementById('year-summary-cards');
        if (ysc)
            ysc.innerHTML = '';
    }

    function showRevenueError(message) {
        const box = document.getElementById('rev-error-box');
        if (!box)
            return;
        box.style.display = 'block';
        box.innerHTML = `<div class="rev-error"><strong>\u26A0 ${message}</strong></div>`;
    }

    function hideRevenueError() {
        const box = document.getElementById('rev-error-box');
        if (!box)
            return;
        box.style.display = 'none';
        box.innerHTML = '';
    }

    function runRmsNow() {
        const btn = event && event.currentTarget ? event.currentTarget : null;
        const original = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Corriendo...';
        }
        google.script.run
        .withSuccessHandler(res => {
            if (btn) {
                btn.disabled = false;
                btn.textContent = original;
            }
            if (!res || !res.success) {
                alert('No se pudo correr RMS: ' + ((res && res.error) || 'error desconocido'));
                return;
            }
            alert(res.message || 'RMS disparado correctamente.');
        })
        .withFailureHandler(err => {
            if (btn) {
                btn.disabled = false;
                btn.textContent = original;
            }
            alert('Error al correr RMS: ' + (err && err.message ? err.message : String(err)));
        })
        .runRmsPipeline();
    }

    function renderRoomtypePerformance(data) {
        const rows = data.room_type_summary || [];
        const el = document.getElementById('roomtype-performance');
        if (!el)
            return;
        if (!rows.length) {
            el.innerHTML = '<div class="rev-no-data">Sin datos por tipo de habitaci\u00F3n.</div>';
            return;
        }
        const maxRev = Math.max(...rows.map(r => Number(r.gross_revenue || 0)), 1);
        el.innerHTML = rows.map(r => {
            const pct = Math.round((Number(r.gross_revenue || 0) / maxRev) * 100);
            return `<div class="rev-ch-row" style="margin-bottom:12px;">
            <span class="rev-ch-label" style="width:96px;">${r.room_type}</span>
            <div class="rev-ch-bar-track"><div class="rev-ch-bar-fill" style="width:${pct}%;background:rgba(111,91,70,.7);"></div></div>
            <span class="rev-ch-pct">${fmx(r.gross_revenue)}</span>
        </div>
        <div class="approval-subline" style="margin:-4px 0 12px 106px;">ADR ${
            fmx(r.adr)} \u00B7 RN ${fmxDec(r.room_nights, 0)} \u00B7 Neto ${fmx(r.net_revenue)}</div>`;
        }).join('');
    }

    function renderPricingAlerts(data) {
        const wrap = document.getElementById('pricing-alerts-box');
        if (!wrap)
            return;
        const p = data.pricing_alerts || {};
        const exceptions = p.exceptions || [];
        const anomalies = p.anomalies || [];
        const all = exceptions.slice(0, 3).map(x => ({
            ...x,
            kind: 'Excepci\u00F3n'
        })).concat(anomalies.slice(0, 3).map(x => ({
            ...x,
            kind: 'Anomal\u00EDa'
        })));
        if (!all.length) {
            wrap.innerHTML = '<div class="rev-no-data">Sin alertas activas.</div>';
            return;
        }
        wrap.innerHTML = all.map(a => `<div class="approval-row" style="padding:12px 14px;margin-bottom:10px;">
        <div style="flex:1;min-width:0;">
            <div class="approval-subline"><strong>${
        a.kind}</strong> \u00B7 ${a.date || '\u2014'} \u00B7 ${a.room_type || '\u2014'}</div>
            <div class="approval-card-note">${a.pricing_exception || a.anomaly_flag || a.pricing_reason || 'Sin detalle'}</div>
        </div>
        <div style="flex-shrink:0;"><span class="status-badge ${
        a.kind === 'Excepci\u00F3n' ? 'low' : 'crit'}">${a.kind}</span></div>
    </div>`
        ).join('');
    }


    function pctSmartValue(x) {
        if (x == null || isNaN(x))
            return null;
        const n = Number(x);
        return Math.abs(n) <= 1 ? n * 100 : n;
    }
    function pctSmartText(x, digits=1) {
        const v = pctSmartValue(x);
        return v == null ? '\u2014' : Number(v).toFixed(digits) + '%';
    }
    function pctFromShare(x) {
        return pctSmartText(x, 1);
    }
    function formatMetricLabel(key) {
        const labels = {
            occupancy: 'Ocupaci\u00F3n',
            adr_final: 'ADR final',
            gross_revenue: 'Ingresos brutos',
            net_revenue: 'Ingresos netos',
            revpar: 'RevPAR',
            utilidad: 'Utilidad',
            margen_pct: 'Margen %',
            room_nights: 'Noches habitaci\u00F3n',
            reservas: 'Stays',
            ocupacion_oficial: 'Ocupaci\u00F3n oficial',
            adr_oficial: 'ADR oficial',
            ingresos_oficiales: 'Ingresos oficiales',
            rn_oficial: 'RN oficial',
            costo_total_real: 'Costo total real',
            costo_fijo: 'Costo fijo',
            costo_nominas: 'Costo n\u00F3minas',
            costo_restaurante: 'Costo restaurante',
            costo_externos: 'Costo externos',
            costo_lavanderia: 'Costo lavander\u00EDa',
            costo_mantenimiento: 'Costo mantenimiento'
        };
        return labels[key] || key;
    }
    function calcCorrelation(xs, ys) {
        const n = xs.length;
        if (n < 2)
            return {
                corr: null,
                slope: null,
                intercept: null
            };
        const mx = xs.reduce((a, b) => a + b, 0) / n,
            my = ys.reduce((a, b) => a + b, 0) / n;
        let sxx = 0,
            syy = 0,
            sxy = 0;
        for (let i = 0; i < n; i++) {
            const dx = xs[i] - mx,
                dy = ys[i] - my;
            sxx += dx * dx;
            syy += dy * dy;
            sxy += dx * dy;
        }
        const corr = (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : null;
        const slope = sxx ? sxy / sxx : null;
        const intercept = (slope != null) ? my - slope * mx : null;
        return {
            corr,
            slope,
            intercept
        };
    }
    function getFinanceMonthlyRows(data) {
        return (data.finance_monthly || []).filter(r => r.month_key).map(r => ({
            ...r,
            occupancy: pctSmartValue(r.occupancy),
            margen_pct: pctSmartValue(r.margen_pct),
            ocupacion_oficial: pctSmartValue(r.ocupacion_oficial)
        }));
    }
    function buildOwnerActions(data) {
        const actions = [];
        const hp = data.high_pressure_dates_next_7 || [];
        const alerts = data.pricing_alerts || {
            total_exceptions: 0,
            total_anomalies: 0
        };
        const channels = data.channel_summary || [];
        const direct = channels.find(c => c.channel === 'direct');
        const totalBookings = channels.reduce((s, c) => s + channelCount(c), 0);
        const directShare = totalBookings ? channelCount(direct) / totalBookings : null;
        if (hp.length)
            actions.push({
                title: 'Protege fechas fuertes',
                text: `Hay ${hp.length} fecha(s) de alta presi\u00F3n en los pr\u00F3ximos 7 d\u00EDas. Evita descuentos agresivos y revisa m\u00EDnimos de estancia.`
            });
        if ((alerts.total_exceptions || 0) + (alerts.total_anomalies || 0) > 0)
            actions.push({
                title: 'Revisar alertas del pricing engine',
                text: `El RMS detect\u00F3 ${(alerts.total_exceptions || 0) + (alerts.total_anomalies || 0)} alertas. Prioriza excepciones antes de aprobar tarifas.`
            });
        if (directShare != null)
            actions.push({
                title: 'Crecimiento de venta directa',
                text: `La participaci\u00F3n directa va en ${pctFromShare(directShare)} de reservas. \u00DAsalo como referencia para medir si marketing est\u00E1 convirtiendo.`
            });
        if (!actions.length)
            actions.push({
                title: 'Operaci\u00F3n estable',
                text: 'Hoy no hay se\u00F1ales cr\u00EDticas. Mant\u00E9n seguimiento de ocupaci\u00F3n y aprobaciones pendientes.'
            });
        return actions.slice(0, 3);
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       PANEL: DIARIO
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function renderDaily(data) {
        const daily = data.daily_overview || {};

        document.getElementById('kpi-adr-mes').textContent = fmx(daily.adr_mes);
        document.getElementById('kpi-revpar-mes').textContent = fmx(daily.revpar_mes);
        document.getElementById('kpi-occ-mes').textContent = (daily.ocupacion_mes != null && daily.ocupacion_mes !== '') ? pctSmartText(daily.ocupacion_mes) : '\u2014';
        document.getElementById('kpi-gross-mes').textContent = fmx(daily.ingresos_brutos_mes);

        const util = daily.utilidad_estimada_mes;
        const utilEl = document.getElementById('kpi-util-mes');
        utilEl.textContent = fmx(util);
        utilEl.className = 'rev-kpi-value' + (util > 0 ? ' text-ok' : util < 0 ? ' text-crit' : '');

        // AI note
        const noteEl = document.getElementById('daily-ai-text');
        if (daily.nota_ai && String(daily.nota_ai).length > 10) {
            noteEl.innerHTML = String(daily.nota_ai).replace(/\*\*(.*?)\*\*/g, '<em>$1</em>');
        } else {
            const actions = buildOwnerActions(data);
            noteEl.innerHTML = actions.map(a => `<div style="margin-bottom:12px;"><em>${a.title}</em><br>${a.text}</div>`).join('');
        }

        renderOccChart(data);
        renderChannelMix(data);
        renderHighPressure(data);
        renderRoomtypePerformance(data);
        renderPricingAlerts(data);

        const fin = data.finanzas || {};
        const alerts = data.pricing_alerts || {};
        const channels = data.channel_summary || [];
        const rooms = data.room_type_summary || [];
        const totalStays = channels.reduce((s, c) => s + channelCount(c), 0);
        const direct = channels.find(c => normalizeChannelKey(c.channel) === 'direct');
        const topChannel = channels.slice().sort((a, b) => channelCount(b) - channelCount(a))[0];
        const topRoom = rooms.slice().sort((a, b) => (b.gross_revenue || 0) - (a.gross_revenue || 0))[0];
        document.getElementById('kpi-direct-share').textContent = totalStays ? pctFromShare(channelCount(direct) / totalStays) : '\u2014';

        const breakEvenOcc =
        (fin.break_even_occ_pct != null && !isNaN(fin.break_even_occ_pct))
        ? pctSmartText(fin.break_even_occ_pct)
        : (fin.break_even_occupancy != null && !isNaN(fin.break_even_occupancy))
        ? pctSmartText(fin.break_even_occupancy)
        : '\u2014';

        document.getElementById('mini-break-even-occ').textContent = breakEvenOcc;
        document.getElementById('mini-pricing-alerts').textContent = fmxDec((alerts.total_exceptions || 0) + (alerts.total_anomalies || 0), 0);
        document.getElementById('mini-top-channel').textContent = topChannel ? String(topChannel.channel || '\u2014').toUpperCase() : '\u2014';
        document.getElementById('mini-top-channel-sub').textContent = topChannel ? `${fmxDec(topChannel.stays || 0, 0)} reservas \u00B7 ${fmx(topChannel.net_revenue || 0)} netos` : 'Sin datos de canales.';
        document.getElementById('mini-top-room').textContent = topRoom ? String(topRoom.room_type || '\u2014').toUpperCase() : '\u2014';
        document.getElementById('mini-top-room-sub').textContent = topRoom ? `${fmx(topRoom.gross_revenue || 0)} brutos \u00B7 ADR ${fmx(topRoom.adr || 0)}` : 'Sin datos por habitaci\u00F3n.';
        const ownerBox = document.getElementById('owner-actions-box');
        if (ownerBox) {
            ownerBox.innerHTML = buildOwnerActions(data).map(a => `<div class="decision-item"><strong>${a.title}</strong><span>${a.text}</span></div>`).join('');
        }
    }

    function renderOccChart(data) {
        const demandRows = (data.chart_demand60 || (data.charts && data.charts.demand60) || []).filter(r => String(r.date || r.fecha || '').trim());
        const agg = demandRows.length
        ? demandRows.map(r => ({
            date: String(r.date || r.fecha || '').slice(0, 10),
            avg_occupancy: Number(r.avg_occ != null ? r.avg_occ : (r.avg_occupancy != null ? r.avg_occupancy : r.occupancy)) || 0,
            avg_demand_pressure: Number(r.avg_pressure != null ? r.avg_pressure : (r.avg_demand_pressure != null ? r.avg_demand_pressure : r.demand_pressure)) || 0,
            high_pressure_any: Number((r.avg_pressure != null ? r.avg_pressure : r.avg_demand_pressure) || 0) >= 0.65 ? 1 : 0
        }))
        : ((data.occupancy_calendar || {}).daily_aggregate || []);
        const today = new Date().toISOString().slice(0, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 60);
        const cutStr = cutoff.toISOString().slice(0, 10);
        const filtered = agg.filter(r => String(r.date || '') > today && String(r.date || '') <= cutStr).slice(0, 60);

        const wrap = document.getElementById('chart-occ').parentElement;
        if (!filtered.length) {
            wrap.innerHTML = '<div class="rev-no-data">ERROR: Sin datos de demanda para los pr\u00F3ximos 60 d\u00EDas.</div>';
            return;
        }
        if (!wrap.querySelector('canvas'))
            wrap.innerHTML = '<canvas id="chart-occ"></canvas>';
        const labels = filtered.map(r => String(r.date || '').slice(5));
        const vals = filtered.map(r => +pctSmartValue(r.avg_occupancy).toFixed(1));
        const colors = vals.map(v => v >= 82 ? 'rgba(138,75,71,.7)' : v >= 65 ? 'rgba(181,137,46,.7)' : v >= 45 ? 'rgba(139,106,47,.7)' : 'rgba(79,107,77,.7)');
        const ctx = document.getElementById('chart-occ');
        if (!ctx)
            return;
        if (chartOcc)
            chartOcc.destroy();
        chartOcc = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: vals,
                    backgroundColor: colors,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: c => `Ocupaci\u00F3n: ${c.raw}%`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: 10
                            },
                            maxTicksLimit: 15,
                            color: '#938574'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: v => v + '%',
                            font: {
                                size: 10
                            },
                            color: '#938574'
                        },
                        grid: {
                            color: 'rgba(198,178,147,.15)'
                        }
                    }
                }
            }
        });
    }

    function renderChannelMix(data) {
        const raw = data.channel_summary || [];
        const normalized = raw.map(c => ({
            ...c,
            key: normalizeChannelKey(c.channel),
            count: channelCount(c)
        }));
        const el = document.getElementById('rev-channel-mix');
        if (!normalized.length) {
            el.innerHTML = '<div class="rev-no-data">ERROR: Sin datos en CHANNEL_SUMMARY.</div>';
            return;
        }
        const buckets = {
            booking: {
                label: 'Booking',
                count: 0
            },
            direct: {
                label: 'Directo',
                count: 0
            },
            expedia: {
                label: 'Expedia',
                count: 0
            },
            otros: {
                label: 'Otros',
                count: 0
            }
        };
        normalized.forEach(c => {
            buckets[c.key] = buckets[c.key] || {
                label: c.key,
                count: 0
            };
            buckets[c.key].count += c.count;
        });
        const ch = Object.entries(buckets).map(([key, v]) => ({
            channel: key,
            label: v.label,
            reservas: v.count
        })).filter(x => x.reservas > 0);
        if (!ch.length) {
            el.innerHTML = '<div class="rev-no-data">Sin reservas por canal.</div>';
            return;
        }
        const total = ch.reduce((s, c) => s + c.reservas, 0);
        const colors = {
            direct: '#6f5b46',
            booking: '#376b6b',
            expedia: '#b5892e',
            otros: '#938574'
        };
        const cx = 70,
            cy = 70,
            r = 52,
            stroke = 18,
            circ = 2 * Math.PI * r;
        let offset = 0,
            segs = '';
        ch.forEach(c => {
            const pct = total > 0 ? c.reservas / total : 0;
            const dash = pct * circ,
                gap = circ - dash;
            const color = colors[c.channel] || '#b8ad9d';
            segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
            offset += dash;
        });
        const top = [...ch].sort((a, b) => b.reservas - a.reservas)[0];
        const topPct = total > 0 ? Math.round((top.reservas / total) * 100) : 0;
        const bars = ch.map(c => {
            const pct = total > 0 ? ((c.reservas / total) * 100).toFixed(1) : '0.0';
            return `<div class="rev-ch-row"><span class="rev-ch-label">${c.label}</span><div class="rev-ch-bar-track"><div class="rev-ch-bar-fill" style="width:${pct}%;background:${colors[c.channel] || '#b8ad9d'};animation:barGrow .6s ease both;"></div></div><span class="rev-ch-pct">${pct}%</span></div>`;
        }).join('');
        el.innerHTML = `<div class="rev-donut-wrap"><svg class="rev-donut-svg" viewBox="0 0 140 140">${segs}<text x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;fill:var(--text)">${topPct}%</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;fill:var(--text-faint)">${top.label.toUpperCase()}</text></svg></div><div class="rev-channel-bars">${bars}</div>`;
    }

    function renderHighPressure(data) {
        const dates = data.high_pressure_dates_next_7 || [];
        const el = document.getElementById('high-pressure-list');
        if (!dates.length) {
            el.innerHTML = '<div class="rev-no-data">\u2713 Sin fechas de alta presi\u00F3n en los pr\u00F3ximos 7 d\u00EDas.</div>';
            return;
        }
        el.innerHTML = dates.map(d =>
        `<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:var(--critical-bg);border:1px solid rgba(138,75,71,.2);color:var(--critical);font-size:12px;font-weight:600;margin:4px;"><span>\u2B24</span><span>${d}</span></div>`
        ).join('');
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       PANEL: APROBACI\u00D3N
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    let approvalRoomFilter = 'all';
    let pendingApproval = null; // {mode:'single'|'all', fecha, room, approved, rowIdx}
    function normalizeRoomName(v) {
        return String(v || '').trim().toLowerCase();
    }

    function renderApproval(data) {
        const allRows = (data.rates_approval || []).slice().sort((a, b) => {
            const ad = (a.fecha || '').localeCompare(b.fecha || '');
            if (ad !== 0)
                return ad;
            return (a.tipo_habitacion || '').localeCompare(b.tipo_habitacion || '');
        });

        const visibleRows = allRows.filter(r => String(r.aprobado || '').toUpperCase() !== 'SI');
        const pending = visibleRows.filter(r => !r.aprobado || r.aprobado === '');
        const rejected = visibleRows.filter(r => String(r.aprobado || '').toUpperCase() === 'NO');
        document.getElementById('approval-count-note').textContent =
        `${pending.length} pendientes \u00B7 ${rejected.length} rechazadas`;

        const filterEl = document.getElementById('approval-room-filter');
        const roomMap = {};
        visibleRows.forEach(r => {
            const raw = String(r.tipo_habitacion || '').trim();
            const key = normalizeRoomName(raw);
            if (raw && !roomMap[key])
                roomMap[key] = raw;
        });
        const rooms = Object.values(roomMap).sort();
        filterEl.innerHTML =
        `<button class="filter-btn ${approvalRoomFilter === 'all' ? 'active' : ''}" onclick="setApprovalFilter('all',this)">Todos</button>` +
        rooms.map(r => `<button class="filter-btn ${normalizeRoomName(approvalRoomFilter) === normalizeRoomName(r) ? 'active' : ''}" onclick="setApprovalFilter(${JSON.stringify(r)},this)">${r}</button>`).join('');

        const filtered = approvalRoomFilter === 'all'
        ? visibleRows
        : visibleRows.filter(r => normalizeRoomName(r.tipo_habitacion) === normalizeRoomName(approvalRoomFilter));

        renderApprovalList(filtered);
    }

    function approvalMoney(n) { return fmx(n); }
    function approvalPct(n) { return fmxPct(n); }
    function escAttr(v) { return String(v || '').replace(/'/g, "\\'").replace(/\n/g, ' '); }

    function renderApprovalList(rows) {
        const listEl = document.getElementById('approval-list');
        if (!rows.length) {
            listEl.innerHTML = '<div class="rev-no-data">No hay tarifas pendientes en este filtro.</div>';
            return;
        }

        listEl.innerHTML = rows.map((r, i) => {
            const chgPct = Number(r.cambio_pct || 0);
            const chgCls = chgPct >= 0 ? 'change-up' : 'change-down';
            const chgLabel = chgPct >= 0 ? `+${chgPct}%` : `${chgPct}%`;
            const fechaArg = escAttr(r.fecha);
            const roomArg = escAttr(r.tipo_habitacion);
            const pressureBadge = r.presion_demanda ? `<span class="status-badge low">${r.presion_demanda}</span>` : '';
            const alertBadge = r.alerta ? `<span class="status-badge crit">${String(r.alerta).replace(/_/g, ' ')}</span>` : '';

            return `<div class="approval-row" id="approval-row-${i}" style="display:block;padding:20px;">
                <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px;">
                    <div>
                        <div class="approval-main-price">${r.fecha || 'â€”'}</div>
                        <div class="approval-subline">${r.tipo_habitacion || 'â€”'} Â· ${r.temporada || 'Sin temporada'} Â· Base ${approvalMoney(r.precio_base)}</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${pressureBadge}${alertBadge}<span class="approval-change ${chgCls}">${chgLabel}</span></div>
                </div>

                <div class="approval-price-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px;">
                    <div class="approval-price-item"><span class="approval-price-label">Directa flexible</span><span class="approval-price-val">${approvalMoney(r.precio_directo_rec)}</span><span class="approval-subline">Esta es la unica que se envia a Cloudbeds</span></div>
                    <div class="approval-price-item"><span class="approval-price-label">Directa no reemb.</span><span class="approval-price-val">${approvalMoney(r.precio_directo_nonref_rec)}</span><span class="approval-subline">Referencia comercial</span></div>
                    <div class="approval-price-item"><span class="approval-price-label">Booking flexible</span><span class="approval-price-val">${approvalMoney(r.precio_booking_rec)}</span><span class="approval-subline">Referencia OTA</span></div>
                    <div class="approval-price-item"><span class="approval-price-label">Booking no reemb.</span><span class="approval-price-val">${approvalMoney(r.precio_booking_nonref_rec)}</span><span class="approval-subline">Referencia OTA</span></div>
                    <div class="approval-price-item"><span class="approval-price-label">Expedia</span><span class="approval-price-val">${approvalMoney(r.precio_expedia_rec)}</span><span class="approval-subline">Referencia OTA</span></div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px;">
                    <div class="rev-mini-card"><div class="rev-mini-label">Utilidad esperada</div><div class="rev-mini-value">${approvalMoney(r.expected_profit)}</div><div class="rev-mini-sub">Neta esperada: ${approvalMoney(r.expected_net_revenue)}</div></div>
                    <div class="rev-mini-card"><div class="rev-mini-label">Prob. directa</div><div class="rev-mini-value">${approvalPct(r.expected_direct_probability)}</div><div class="rev-mini-sub">Booking ${approvalPct(r.expected_booking_probability)} Â· Expedia ${approvalPct(r.expected_expedia_probability)}</div></div>
                    <div class="rev-mini-card"><div class="rev-mini-label">Ocupacion seÃ±al</div><div class="rev-mini-value">${approvalPct(r.expected_occupancy_signal)}</div><div class="rev-mini-sub">Pace: ${fmxDec(r.pace_ratio_occ || 0, 2)}</div></div>
                    <div class="rev-mini-card"><div class="rev-mini-label">Rango permitido</div><div class="rev-mini-value">${approvalMoney(r.floor_price)} - ${approvalMoney(r.ceiling_price)}</div><div class="rev-mini-sub">Costo variable: ${approvalMoney(r.variable_cost_used)}</div></div>
                </div>

                <div class="approval-card-note" style="margin-bottom:14px;">
                    <strong>Motivo:</strong> ${r.motivo || 'Sin comentario del modelo.'}<br>
                    <strong>Confianza:</strong> ${r.confianza || 'â€”'} Â· <strong>Cuartos disponibles:</strong> ${r.available_rooms_for_pricing || 'â€”'}
                </div>

                <div class="approval-actions" style="justify-content:flex-end;">
                    <button class="btn-approve" onclick="openApprovalModal('${fechaArg}','${roomArg}',true,${i})">Aprobar directa</button>
                    <button class="btn-reject" onclick="openApprovalModal('${fechaArg}','${roomArg}',false,${i})">Rechazar</button>
                </div>
            </div>`;
        }).join('');
    }

    function setApprovalFilter(room, btn) {
        approvalRoomFilter = room;
        document.querySelectorAll('#approval-room-filter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (revData)
            renderApproval(revData);
    }

    function openApprovalModal(fecha, room, approved, rowIdx) {
        pendingApproval = {
            mode: 'single',
            fecha,
            room,
            approved,
            rowIdx
        };
        document.getElementById('modal-title').textContent = approved ? 'Aprobar tarifa' : 'Rechazar tarifa';
        document.getElementById('modal-sub').textContent = `${room} Â· ${fecha} Â· ${approved ? 'Se enviarÃ¡ solo la tarifa directa a Cloudbeds y se registrarÃ¡ en LOG_CHANGE_PRICES.' : 'La recomendaciÃ³n se registrarÃ¡ como rechazada en LOG_CHANGE_PRICES.'}`;
        document.getElementById('modal-notes').value = '';
        document.getElementById('modal-saving').textContent = '';
        const btn = document.getElementById('modal-confirm-btn');
        btn.textContent = approved ? '\u2713 Aprobar' : '\u2717 Rechazar';
        btn.className = approved ? 'btn-approve' : 'btn-reject';
        btn.disabled = false;
        document.getElementById('approval-modal').style.display = 'flex';
    }

    function openApproveAllModal() {
        pendingApproval = {
            mode: 'all'
        };
        document.getElementById('modal-title').textContent = 'Aprobar todas las pendientes';
        document.getElementById('modal-sub').textContent = 'Se aprobarÃ¡n las recomendaciones visibles de WEB_RECOMMENDED_RATES. Solo se enviarÃ¡ la tarifa directa a Cloudbeds y se registrarÃ¡ en LOG_CHANGE_PRICES.';
        document.getElementById('modal-notes').value = '';
        document.getElementById('modal-saving').textContent = '';
        const btn = document.getElementById('modal-confirm-btn');
        btn.textContent = 'Aprobar todas';
        btn.className = 'btn-approve';
        btn.disabled = false;
        document.getElementById('approval-modal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('approval-modal').style.display = 'none';
        pendingApproval = null;
    }

    function closeModalOnOverlay(e) {
        if (e.target === document.getElementById('approval-modal'))
            closeModal();
    }

    function confirmApproval() {
        if (!pendingApproval)
            return;
        const notes = document.getElementById('modal-notes').value.trim();
        const savingEl = document.getElementById('modal-saving');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.disabled = true;

        if (pendingApproval.mode === 'all') {
            savingEl.textContent = 'Aprobando y enviando todas las pendientes a Cloudbeds...';
            google.script.run
            .withSuccessHandler(result => {
                confirmBtn.disabled = false;
                if (!result.success && result.failed === undefined) {
                    savingEl.textContent = '\u26A0 ERROR: ' + (result.error || 'Fallo desconocido.');
                    return;
                }
                const summary = `\u2713 ${result.ok || 0} aprobadas \u00B7 ${result.failed || 0} con error`;
                savingEl.textContent = summary;
                loadRevenue();
                setTimeout(() => closeModal(), 1800);
            })
            .withFailureHandler(err => {
                confirmBtn.disabled = false;
                savingEl.textContent = '\u26A0 ERROR DE CONEXI\u00D3N: ' + (err && err.message ? err.message : String(err));
            })
            .approveAllPendingRates(notes, 'Sistema');
            return;
        }

        const {fecha, room, approved, rowIdx} = pendingApproval;
        savingEl.textContent = approved ? 'Guardando y enviando a Cloudbeds...' : 'Guardando rechazo...';

        google.script.run
        .withSuccessHandler(result => {
            confirmBtn.disabled = false;
            if (!result.success) {
                savingEl.textContent = '\u26A0 ERROR: ' + (result.error || 'Fallo desconocido.');
                return;
            }
            const row = document.getElementById('approval-row-' + rowIdx);
            if (row) {
                row.classList.toggle('approved', approved);
                row.classList.toggle('rejected', !approved);
            }
            savingEl.textContent = approved
            ? `\u2713 Aprobada y enviada. Tarifa directa ${fmx(result.direct_price)}`
            : (result.message || '\u2713 Rechazada.');
            loadRevenue();
            setTimeout(() => closeModal(), 1800);
        })
        .withFailureHandler(err => {
            confirmBtn.disabled = false;
            savingEl.textContent = '\u26A0 ERROR DE CONEXI\u00D3N: ' + (err && err.message ? err.message : String(err));
        })
        .approveAndPushRate(fecha, room, approved, notes, 'Sistema');
    }
    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       PANEL: MENSUAL
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function renderMonthly(data) {
        const monthly = data.monthly_summary || [];
        const yearly = data.yearly_forecast || [];
        const displayYear = Number(data.current_year || new Date().getFullYear());
        const financeRows = getFinanceMonthlyRows(data)
        .filter(r => Number(r.year || 0) === displayYear)
        .slice()
        .sort((a, b) => String(a.month_key).localeCompare(String(b.month_key)));
        const cardsEl = document.getElementById('monthly-forecast-cards');
        const monthlyMixMap = {};

        const MONTHS_CURRENT = Array.from({
            length: 12
        }, (_, i) => {
            const mm = String(i + 1).padStart(2, '0');
            const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return {
                key: `${displayYear}-${mm}`,
                name: `${names[i]} ${displayYear}`
            };
        });
        const normalizeMonthKey = (v) => String(v || '').slice(0, 7);
        const normalizeTipo = (v) => String(v || '').toLowerCase().trim();
        const num = v => Number(v) || 0;

        const adaptMonthlyRow = (r) => ({
            month_key: normalizeMonthKey(r.month_key),
            month_name: r.month_name || '',
            temporada: r.temporada || '',
            tipo: r.tipo || '',
            ocupacion_pct: num(r.ocupacion_pct),
            room_nights_est: num(r.room_nights_est),
            adr_estimado: num(r.adr_estimado),
            ingresos_brutos_est: num(r.ingresos_brutos_est),
            costo_fijo: num(r.costo_fijo),
            costo_variable_est: num(r.costo_variable_est),
            utilidad_estimada: num(r.utilidad_estimada),
            confianza_prediccion: r.confianza_prediccion || '',
            prob_utilidad_positiva: r.prob_utilidad_positiva || '',
            nota_ai: r.nota_ai || ''
        });
        const adaptYearlyRow = (r) => ({
            month_key: normalizeMonthKey(r.mes),
            month_name: normalizeMonthKey(r.mes),
            temporada: r.temporada || '',
            tipo: r.tipo || '',
            ocupacion_pct: num(r.ocupacion_pct),
            room_nights_est: num(r.room_nights),
            adr_estimado: num(r.adr),
            ingresos_brutos_est: num(r.ingresos_brutos),
            costo_fijo: 0,
            costo_variable_est: Math.max(0, num(r.costo_total) - 0),
            utilidad_estimada: num(r.utilidad),
            confianza_prediccion: '',
            prob_utilidad_positiva: '',
            nota_ai: ''
        });

        const currentMonthKey = String(data.current_month_key || new Date().toISOString().slice(0, 7));

        const actualMap = {};
        const forecastMap = {};

        monthly.forEach(r => {
            const mk = normalizeMonthKey(r.month_key);
            const tipo = normalizeTipo(r.tipo);
            monthlyMixMap[mk] = safeMonthMix(r);
            if (['historico', 'real', 'actual'].includes(tipo))
                actualMap[mk] = adaptMonthlyRow(r);
            if (['prediccion', 'proyeccion', 'forecast', 'otb'].includes(tipo))
                forecastMap[mk] = adaptMonthlyRow(r);
        });

        yearly.forEach(r => {
            const mk = normalizeMonthKey(r.mes);
            const tipo = normalizeTipo(r.tipo);
            if (tipo === 'real' && !actualMap[mk])
                actualMap[mk] = adaptYearlyRow(r);
            if (['proyeccion', 'prediccion', 'otb'].includes(tipo) && !forecastMap[mk])
                forecastMap[mk] = adaptYearlyRow(r);
        });

        const sourceMap = {};
        (data.monthly_current_year_view || data.monthly_2026_view || []).forEach(m => {
            const mk = String(m.month_key || m.key || m.mes || m.month || '').slice(0, 7);
            if (mk)
                sourceMap[mk] = m;
        });

        const payloadCards = MONTHS_CURRENT.map((baseMonth) => {
            const key = baseMonth.key;
            const sourceRow = sourceMap[key] || {};
            const rawName = String(sourceRow.month_name || sourceRow.name || baseMonth.name || '').trim();
            const invalidName = !rawName || rawName.toLowerCase() === 'undefined' || rawName.toLowerCase() === 'null';
            const name = invalidName ? monthNameFromKey(key) : rawName;
            let actual = sourceRow.actual || actualMap[key] || null;
            let forecast = sourceRow.forecast || forecastMap[key] || null;

            if (key < currentMonthKey && !actual && forecast)
                actual = forecast;
            if (key === currentMonthKey && !forecast)
                forecast = forecastMap[key] || null;
            if (key > currentMonthKey && !forecast && actual && String(actual.tipo || '').toLowerCase() === 'prediccion') {
                forecast = actual;
                actual = null;
            }

            return {
                month_key: key,
                month_name: name,
                temporada: (actual && actual.temporada) || (forecast && forecast.temporada) || sourceRow.temporada || '\u2014',
                actual,
                forecast
            };
        });

        const renderMetricBox = (label, row, cls) => {
            if (!row)
                return `<div class="month-plan-box ${cls}"><div class="month-plan-box-title">${label}</div><div class="month-plan-empty">Sin datos para esta vista.</div></div>`;
            const util = Number(row.utilidad_estimada || 0);
            const utilCls = util >= 0 ? 'text-ok' : 'text-crit';
            const costoTotal = Number(row.costo_fijo || 0) + Number(row.costo_variable_est || 0);
            const tipo = row.tipo || '\u2014';
            return `<div class="month-plan-box ${cls}"><div class="month-plan-box-title">${label}</div><div class="month-plan-metrics">
            <div class="month-plan-metric"><span class="month-plan-metric-label">Ocupaci\u00F3n</span><span class="month-plan-metric-value">${fmxPct(row.ocupacion_pct)}</span></div>
            <div class="month-plan-metric"><span class="month-plan-metric-label">ADR</span><span class="month-plan-metric-value">${fmx(row.adr_estimado)}</span></div>
            <div class="month-plan-metric"><span class="month-plan-metric-label">Ingresos</span><span class="month-plan-metric-value">${fmx(row.ingresos_brutos_est)}</span></div>
            <div class="month-plan-metric"><span class="month-plan-metric-label">Costo total</span><span class="month-plan-metric-value">${fmx(costoTotal)}</span></div>
            <div class="month-plan-metric"><span class="month-plan-metric-label">Utilidad</span><span class="month-plan-metric-value ${utilCls}">${fmx(util)}</span></div>
        </div><div class="month-plan-box-foot">Tipo de fila: ${tipo}</div></div>`;
        };

        if (!payloadCards.length)
            cardsEl.innerHTML = `<div class="rev-no-data">No hay datos de ${displayYear} en el Google Sheet.</div>`;
        else
            cardsEl.innerHTML = payloadCards.map(m => {
                const act = m.actual || null;
                const fc = m.forecast || null;
                const season = m.temporada || (fc && fc.temporada) || (act && act.temporada) || '\u2014';
                const confidence = (fc && fc.confianza_prediccion) || '\u2014';
                const prob = (fc && fc.prob_utilidad_positiva) || '\u2014';
                const subline = m.month_key < currentMonthKey
                ? 'Mes cerrado: muestra real y referencia de forecast si existe.'
                : m.month_key === currentMonthKey
                ? 'Mes actual: real acumulado + pron\u00F3stico.'
                : 'Mes futuro: pron\u00F3stico y datos actuales si existen.';
                return `<div class="month-plan-card"><div class="month-plan-top"><div><div class="month-plan-title">${m.month_name || m.month_key}</div><div class="month-plan-subline">${subline}</div></div><span class="month-plan-season">${season}</span></div><div class="month-plan-grid">${renderMetricBox('Actual / Real', act, 'actual')}${renderMetricBox('Pron\u00F3stico', fc, 'forecast')}</div><div class="month-plan-footer">Confianza: ${confidence} \u00B7 Probabilidad de utilidad positiva: ${prob}</div></div>`;
            }).join('');

        const recent = financeRows.slice().reverse();
        const summaryEl = document.getElementById('monthly-exec-summary');
        const tableEl = document.getElementById('monthly-exec-table');
        if (recent.length) {
            const latestOfficial = recent.find(r => r.tiene_reporte) || null;
            const current = latestOfficial || recent[0];
            const positives = recent.filter(r => Number(r.utilidad || 0) > 0).length;
            const bestRevpar = recent.reduce((best, r) => !best || Number(r.revpar || 0) > Number(best.revpar || 0) ? r : best, null);
            const bestUtil = recent.reduce((best, r) => !best || Number(r.utilidad || -Infinity) > Number(best.utilidad || -Infinity) ? r : best, null);
            summaryEl.innerHTML = `
            <div class="finance-summary-card"><div class="rev-mini-label">\u00DAltimo mes oficial</div><div class="rev-mini-value">${current.month_name || current.month_key}</div><div class="rev-mini-sub">Ocupaci\u00F3n ${pctSmartText(current.occupancy)} \u00B7 ADR ${fmx(current.adr_final)}</div></div>
            <div class="finance-summary-card"><div class="rev-mini-label">Ingresos mes base</div><div class="rev-mini-value">${fmx(current.gross_revenue)}</div><div class="rev-mini-sub">Utilidad ${fmx(current.utilidad)}</div></div>
            <div class="finance-summary-card"><div class="rev-mini-label">Mes con mejor RevPAR</div><div class="rev-mini-value">${bestRevpar ? fmx(bestRevpar.revpar) : '\u2014'}</div><div class="rev-mini-sub">${bestRevpar ? (bestRevpar.month_name || bestRevpar.month_key) : 'Sin dato'}</div></div>
            <div class="finance-summary-card"><div class="rev-mini-label">Meses rentables</div><div class="rev-mini-value">${positives}/${recent.length}</div><div class="rev-mini-sub">Mejor utilidad: ${bestUtil ? fmx(bestUtil.utilidad) : '\u2014'}</div></div>`;
            tableEl.innerHTML = recent.map(r => {
                const reportBadge = r.tiene_reporte ? '<span class="status-badge ok">Oficial</span>' : '<span class="status-badge low">Estimado</span>';
                const mCls = Number(r.margen_pct || 0) >= 0 ? 'text-ok' : 'text-crit';
                const mix = monthlyMixMap[r.month_key] || {};
                return `<tr><td class="primary-cell">${r.month_name || r.month_key}</td><td><span class="rev-rate-season-badge season-${r.season || 'Mid'}">${r.season || '\u2014'}</span></td><td>${pctSmartText(r.occupancy)}</td><td>${fmx(r.adr_final)}</td><td>${fmx(r.gross_revenue)}</td><td class="${Number(r.utilidad || 0) >= 0 ? 'text-ok' : 'text-crit'}">${fmx(r.utilidad)}</td><td class="${mCls}">${pctSmartText(r.margen_pct)}</td><td>${mix.booking == null ? '\u2014' : pctSmartText(mix.booking)}</td><td>${mix.direct == null ? '\u2014' : pctSmartText(mix.direct)}</td><td>${mix.expedia == null ? '\u2014' : pctSmartText(mix.expedia)}</td><td>${mix.otros == null ? '\u2014' : pctSmartText(mix.otros)}</td><td>${reportBadge}</td></tr>`;
            }).join('');

            const orderedAll = financeRows.slice();
            const labels = orderedAll.map(r => r.month_name || r.month_key);
            const gross = recent.slice().reverse().map(r => Number(r.gross_revenue || 0));
            const util = recent.slice().reverse().map(r => Number(r.utilidad || 0));
            const occ = orderedAll.map(r => Number(pctSmartValue(r.occupancy) || 0));
            const revpar = orderedAll.map(r => Number(r.revpar || 0));
            const makeChart = (id, refName, type, datasets, yFmt='money') => {
                const ctx = document.getElementById(id);
                if (!ctx)
                    return null;
                if (window[refName])
                    window[refName].destroy();
                window[refName] = new Chart(ctx.getContext('2d'), {
                    type,
                    data: {
                        labels,
                        datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#6c6052',
                                    font: {
                                        size: 11
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    color: '#938574',
                                    font: {
                                        size: 10
                                    }
                                },
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                ticks: {
                                    color: '#938574',
                                    font: {
                                        size: 10
                                    },
                                    callback: v => yFmt === 'pct' ? v + '%' : fmx(v)
                                },
                                grid: {
                                    color: 'rgba(198,178,147,.15)'
                                }
                            },
                            y2: {
                                position: 'right',
                                display: type === 'bar',
                                ticks: {
                                    color: '#b5892e',
                                    font: {
                                        size: 10
                                    },
                                    callback: v => fmx(v)
                                },
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
                return window[refName];
            };
            chartMonthlyRev = makeChart('chart-monthly-rev', 'chartMonthlyRev', 'bar', [
            {
                label: 'Ingresos',
                data: gross,
                backgroundColor: 'rgba(111,91,70,.55)',
                borderRadius: 6
            },
            {
                label: 'Utilidad',
                data: util,
                backgroundColor: util.map(v => v >= 0 ? 'rgba(79,107,77,.6)' : 'rgba(138,75,71,.5)'),
                borderRadius: 6
            }
            ]);
            chartMonthlyOccAdr = makeChart('chart-monthly-occadr', 'chartMonthlyOccAdr', 'line', [
            {
                label: 'Ocupaci\u00F3n %',
                data: occ,
                borderColor: '#4f6b4d',
                backgroundColor: 'rgba(79,107,77,.10)',
                tension: .35,
                pointRadius: 4,
                fill: true
            },
            {
                label: 'RevPAR',
                data: revpar,
                borderColor: '#b5892e',
                backgroundColor: 'rgba(181,137,46,.08)',
                tension: .35,
                pointRadius: 4,
                fill: false,
                yAxisID: 'y2'
            }
            ], 'pct');
        } else {
            summaryEl.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">Sin datos en WEB_FINANCE_MONTHLY.</div>';
            tableEl.innerHTML = '<tr><td colspan="8" class="loading">Sin datos mensuales.</td></tr>';
        }

        setupScatterControls(financeRows);
        renderMonthlyScatter();
    }

    function setupScatterControls(rows) {
        const xSel = document.getElementById('scatter-x');
        const ySel = document.getElementById('scatter-y');
        const yearSel = document.getElementById('scatter-year');
        if (!xSel || !ySel || !yearSel || !rows.length)
            return;
        const numericKeys = ['occupancy', 'adr_final', 'gross_revenue', 'net_revenue', 'revpar', 'utilidad', 'margen_pct', 'room_nights', 'stays', 'ocupacion_oficial', 'adr_oficial', 'ingresos_oficiales', 'rn_oficial', 'costo_total_real', 'costo_fijo', 'costo_nominas', 'costo_restaurante', 'costo_externos', 'costo_lavanderia', 'costo_mantenimiento'];
        if (!xSel.options.length) {
            xSel.innerHTML = numericKeys.map(k => `<option value="${k}">${formatMetricLabel(k)}</option>`).join('');
            ySel.innerHTML = numericKeys.map(k => `<option value="${k}">${formatMetricLabel(k)}</option>`).join('');
            xSel.value = 'occupancy';
            ySel.value = 'utilidad';
        }
        const years = [...new Set(rows.map(r => String(r.year || '').trim()).filter(Boolean))].sort();
        yearSel.innerHTML = '<option value="all">Todos</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    }


    function isPercentMetric(key) {
        return ['occupancy', 'margen_pct', 'ocupacion_oficial'].includes(key);
    }
    function formatForMetric(key, value) {
        return isPercentMetric(key) ? pctSmartText(value, 1) : fmxDec(value, 2);
    }

    function renderMonthlyScatter() {
        if (!revData)
            return;
        const rows = getFinanceMonthlyRows(revData);
        const xKey = document.getElementById('scatter-x')?.value;
        const yKey = document.getElementById('scatter-y')?.value;
        const year = document.getElementById('scatter-year')?.value || 'all';
        const report = document.getElementById('scatter-report')?.value || 'all';
        if (!rows.length || !xKey || !yKey)
            return;
        let filtered = rows.slice();
        if (year !== 'all')
            filtered = filtered.filter(r => String(r.year) === String(year));
        if (report === 'with_report')
            filtered = filtered.filter(r => r.tiene_reporte);
        if (report === 'without_report')
            filtered = filtered.filter(r => !r.tiene_reporte);
        filtered = filtered.filter(r => r[xKey] != null && r[yKey] != null && !isNaN(Number(r[xKey])) && !isNaN(Number(r[yKey])));
        const pts = filtered.map(r => ({
            x: Number(r[xKey]),
            y: Number(r[yKey]),
            label: r.month_name || r.month_key
        }));
        const ctx = document.getElementById('chart-monthly-scatter');
        if (!ctx)
            return;
        if (chartMonthlyScatter)
            chartMonthlyScatter.destroy();
        const summaryEl = document.getElementById('scatter-year-summary');
        if (!pts.length) {
            const wrap = ctx.parentElement;
            const noData = wrap.querySelector('.scatter-empty-state');
            if (!noData) {
                const div = document.createElement('div');
                div.className = 'rev-no-data scatter-empty-state';
                div.textContent = 'No hay observaciones para esa combinaci\u00F3n.';
                wrap.appendChild(div);
            }
            ctx.style.display = 'none';
            if (summaryEl)
                summaryEl.innerHTML = '<div class="rev-no-data">No hay observaciones para calcular comparaci\u00F3n anual.</div>';
            return;
        }
        ctx.style.display = '';
        const existingEmpty = ctx.parentElement.querySelector('.scatter-empty-state');
        if (existingEmpty)
            existingEmpty.remove();
        const xs = pts.map(p => p.x),
            ys = pts.map(p => p.y);
        const stats = calcCorrelation(xs, ys);
        const minX = Math.min(...xs),
            maxX = Math.max(...xs);
        const trend = (stats.slope == null) ? [] : [{
            x: minX,
            y: stats.intercept + stats.slope * minX
        }, {
            x: maxX,
            y: stats.intercept + stats.slope * maxX
        }];
        chartMonthlyScatter = new Chart(ctx.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [
                {
                    label: 'Meses',
                    data: pts,
                    backgroundColor: 'rgba(111,91,70,.75)',
                    pointRadius: 5,
                    pointHoverRadius: 6
                },
                {
                    label: 'Tendencia',
                    data: trend,
                    type: 'line',
                    borderColor: '#b5892e',
                    backgroundColor: 'transparent',
                    pointRadius: 0,
                    borderWidth: 2,
                    tension: 0
                }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#6c6052',
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const raw = c.raw || {};
                                return `${raw.label || ''} \u00B7 X ${formatForMetric(xKey, raw.x)} \u00B7 Y ${formatForMetric(yKey, raw.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#938574',
                            font: {
                                size: 10
                            },
                            callback: v => isPercentMetric(xKey) ? pctSmartText(v, 1) : fmxDec(v, 0)
                        },
                        title: {
                            display: true,
                            text: formatMetricLabel(xKey),
                            color: '#6c6052'
                        },
                        grid: {
                            color: 'rgba(198,178,147,.15)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#938574',
                            font: {
                                size: 10
                            },
                            callback: v => isPercentMetric(yKey) ? pctSmartText(v, 1) : fmxDec(v, 0)
                        },
                        title: {
                            display: true,
                            text: formatMetricLabel(yKey),
                            color: '#6c6052'
                        },
                        grid: {
                            color: 'rgba(198,178,147,.15)'
                        }
                    }
                }
            }
        });
        document.getElementById('scatter-corr').textContent = stats.corr == null ? '\u2014' : Number(stats.corr).toFixed(2);
        document.getElementById('scatter-n').textContent = String(pts.length);
        document.getElementById('scatter-slope').textContent = stats.slope == null ? '\u2014' : Number(stats.slope).toFixed(2);

        if (summaryEl) {
            const byYear = {};
            filtered.forEach(r => {
                const yr = String(r.year || '');
                const val = Number(r[yKey]);
                if (!yr || isNaN(val))
                    return;
                if (!byYear[yr])
                    byYear[yr] = [];
                byYear[yr].push(val);
            });
            const years = Object.keys(byYear).sort();
            if (!years.length) {
                summaryEl.innerHTML = '<div class="rev-no-data">No hay a\u00F1os suficientes para comparar.</div>';
            } else {
                const statsRows = years.map(yr => {
                    const vals = byYear[yr];
                    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                    const variance = vals.length > 1 ? vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length : 0;
                    const std = Math.sqrt(variance);
                    return {
                        yr,
                        n: vals.length,
                        mean,
                        std
                    };
                });
                const first = statsRows[0];
                const last = statsRows[statsRows.length - 1];
                const delta = statsRows.length > 1 ? last.mean - first.mean : null;
                const deltaPct = (delta != null && first.mean !== 0) ? (delta / first.mean) * 100 : null;
                const insight = delta == null ? 'Solo hay un a\u00F1o con datos para la variable elegida.' : `${formatMetricLabel(yKey)} ${delta >= 0 ? 'sube' : 'baja'} ${formatForMetric(yKey, Math.abs(delta))} vs ${first.yr} (${deltaPct == null ? '\u2014' : (deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1) + '%'})`;
                summaryEl.innerHTML = `
                <div class="info-box" style="margin-bottom:12px;"><strong>Lectura r\u00E1pida:</strong> ${insight}</div>
                <div class="scatter-year-grid">
                    ${
                statsRows.map(row => `<div class="scatter-year-card"><strong>${row.yr}</strong><span>Promedio: ${formatForMetric(yKey, row.mean)}</span><span>Desv. est\u00E1ndar: ${formatForMetric(yKey, row.std)}</span><span>Meses con dato: ${row.n}</span></div>`).join('')}
                </div>`
                ;
            }
        }
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       PANEL: ANUAL
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function renderYearly(data) {
        const ycData = data.year_comparison || {};
        const ycSumm = data.year_summaries || {};
        const financeRows = getFinanceMonthlyRows(data);
        const currentYear = Number(data.current_year || new Date().getFullYear());
        const officialRows = financeRows
        .filter(r => Number(r.year || 0) === currentYear && r.tiene_reporte)
        .sort((a, b) => String(a.month_key || '').localeCompare(String(b.month_key || '')));

        document.getElementById('yearly-projection-title').textContent = `Meses oficiales ${currentYear}`;

        const totalRevenue = officialRows.reduce((s, r) => s + Number(r.gross_revenue || 0), 0);
        const totalCosts = officialRows.reduce((s, r) => s + Number(r.costo_total_real || 0), 0);
        const avgOcc = officialRows.length ? officialRows.reduce((s, r) => s + Number(r.occupancy || 0), 0) / officialRows.length : null;
        const avgAdr = officialRows.length ? officialRows.reduce((s, r) => s + Number(r.adr_final || 0), 0) / officialRows.length : null;
        const avgRevpar = officialRows.length ? officialRows.reduce((s, r) => s + Number(r.revpar || 0), 0) / officialRows.length : null;
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : null;

        const yExec = document.getElementById('yearly-exec-summary');
        yExec.innerHTML = `
        <div class="finance-summary-card"><div class="rev-mini-label">Ingresos totales ${currentYear}</div><div class="rev-mini-value">${fmx(totalRevenue)}</div><div class="rev-mini-sub">Solo meses con reporte oficial</div></div>
        <div class="finance-summary-card"><div class="rev-mini-label">Costos totales ${currentYear}</div><div class="rev-mini-value">${fmx(totalCosts)}</div><div class="rev-mini-sub">Costo total real acumulado</div></div>
        <div class="finance-summary-card"><div class="rev-mini-label">AVG ADR</div><div class="rev-mini-value">${avgAdr == null ? '\u2014' : fmx(avgAdr)}</div><div class="rev-mini-sub">Promedio de meses oficiales</div></div>
        <div class="finance-summary-card"><div class="rev-mini-label">AVG Occupancy</div><div class="rev-mini-value">${avgOcc == null ? '\u2014' : fmxPct(avgOcc)}</div><div class="rev-mini-sub">Promedio de meses oficiales</div></div>
        <div class="finance-summary-card"><div class="rev-mini-label">AVG RevPAR</div><div class="rev-mini-value">${avgRevpar == null ? '\u2014' : fmx(avgRevpar)}</div><div class="rev-mini-sub">Promedio de meses oficiales</div></div>
        <div class="finance-summary-card"><div class="rev-mini-label">Margen de utilidad</div><div class="rev-mini-value ${profitMargin != null && profitMargin >= 0 ? 'text-ok' : 'text-crit'}">${profitMargin == null ? '\u2014' : fmxPct(profitMargin)}</div><div class="rev-mini-sub">Utilidad / ingresos</div></div>`;

        const focus = document.getElementById('yearly-focus-box');
        if (!officialRows.length) {
            focus.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">A\u00FAn no hay meses oficiales para este a\u00F1o.</div>';
        } else {
            const strongest = officialRows.reduce((best, r) => !best || Number(r.utilidad || -Infinity) > Number(best.utilidad || -Infinity) ? r : best, null);
            const weakest = officialRows.reduce((worst, r) => !worst || Number(r.utilidad || Infinity) < Number(worst.utilidad || Infinity) ? r : worst, null);
            const bestOcc = officialRows.reduce((best, r) => !best || Number(r.occupancy || 0) > Number(best.occupancy || 0) ? r : best, null);
            const lowMonths = officialRows.filter(r => Number(r.occupancy || 0) < 35).length;
            focus.innerHTML = `
            <div class="owner-focus-card"><strong>Mejor utilidad</strong><span>${strongest ? `${strongest.month_name || strongest.month_key} con ${fmx(strongest.utilidad)}.` : 'Sin dato.'}</span></div>
            <div class="owner-focus-card"><strong>Mes m\u00E1s d\u00E9bil</strong><span>${weakest ? `${weakest.month_name || weakest.month_key} con ${fmx(weakest.utilidad)}.` : 'Sin dato.'}</span></div>
            <div class="owner-focus-card"><strong>Mayor ocupaci\u00F3n</strong><span>${bestOcc ? `${bestOcc.month_name || bestOcc.month_key} alcanz\u00F3 ${fmxPct(bestOcc.occupancy)}.` : 'Sin dato.'}</span></div>
            <div class="owner-focus-card"><strong>Meses debajo de 35%</strong><span>${lowMonths} mes(es) oficiales estuvieron por debajo de 35% de ocupaci\u00F3n.</span></div>`;
        }

        const channelEl = document.getElementById('yearly-channel-summary');
        const ch = data.channel_summary || [];
        channelEl.innerHTML = ch.length ? ch.map(c => `<div class="rev-ch-row" style="margin-bottom:12px;"><span class="rev-ch-label" style="width:92px;">${String(c.channel || '').toUpperCase()}</span><div class="rev-ch-bar-track"><div class="rev-ch-bar-fill" style="width:${Math.min(100, ((Number(c.net_revenue || 0) / Math.max(...ch.map(x => Number(x.net_revenue || 0)), 1)) * 100).toFixed(1))}%;background:rgba(55,107,107,.7);"></div></div><span class="rev-ch-pct">${fmx(c.net_revenue)}</span></div><div class="approval-subline" style="margin:-4px 0 12px 102px;">ADR ${fmx(c.adr)} \u00B7 margen contribuci\u00F3n ${fmx(c.contribution_margin || 0)}</div>`).join('') : '<div class="rev-no-data">Sin datos de canales.</div>';

        const roomEl = document.getElementById('yearly-roomtype-summary');
        const rooms = data.room_type_summary || [];
        roomEl.innerHTML = rooms.length ? rooms.map(r => `<div class="rev-ch-row" style="margin-bottom:12px;"><span class="rev-ch-label" style="width:92px;">${r.room_type}</span><div class="rev-ch-bar-track"><div class="rev-ch-bar-fill" style="width:${Math.min(100, ((Number(r.gross_revenue || 0) / Math.max(...rooms.map(x => Number(x.gross_revenue || 0)), 1)) * 100).toFixed(1))}%;background:rgba(111,91,70,.72);"></div></div><span class="rev-ch-pct">${fmx(r.gross_revenue)}</span></div><div class="approval-subline" style="margin:-4px 0 12px 102px;">ADR ${fmx(r.adr)} \u00B7 RN ${fmxDec(r.room_nights, 0)}</div>`).join('') : '<div class="rev-no-data">Sin datos por tipo de habitaci\u00F3n.</div>';

        const gridEl = document.getElementById('yearly-months-grid');
        if (!officialRows.length) {
            gridEl.innerHTML = `<div class="rev-no-data">Sin meses oficiales en ${currentYear}.</div>`;
        } else {
            gridEl.innerHTML = officialRows.map(row => {
                const utilCls = Number(row.utilidad || 0) >= 0 ? 'pos' : 'neg';
                return `<div class="yearly-card tipo-real"><div class="yearly-month">${row.month_name || row.month_key}</div><div class="yearly-occ">${fmxPct(row.occupancy)}</div><div class="yearly-adr">ADR ${fmx(row.adr_final)} \u00B7 RevPAR ${fmx(row.revpar)}</div><div class="yearly-util ${utilCls}">${fmx(row.utilidad)}</div><div style="font-size:10px;color:var(--text-faint);margin-top:4px">Oficial</div></div>`;
            }).join('');
        }

        const attachEl = document.getElementById('yearly-projection-attachment');
        if (attachEl)
            attachEl.style.display = 'none';

        const years = Object.keys(ycData).sort();
        const MONTH_ES_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mLabels = MONTH_ES_SHORT.slice(1);
        const YR_COLORS = {
            '2023': {
                border: 'rgba(147,133,116,.8)',
                bg: 'rgba(147,133,116,.12)'
            },
            '2024': {
                border: 'rgba(55,107,107,.85)',
                bg: 'rgba(55,107,107,.12)'
            },
            '2025': {
                border: 'rgba(181,137,46,.9)',
                bg: 'rgba(181,137,46,.14)'
            },
            '2026': {
                border: 'rgba(79,107,77,.9)',
                bg: 'rgba(79,107,77,.14)'
            },
            '2027': {
                border: 'rgba(111,91,70,.8)',
                bg: 'rgba(111,91,70,.12)'
            }
        };
        const summCardsEl = document.getElementById('year-summary-cards');
        if (!Object.keys(ycSumm).length)
            summCardsEl.innerHTML = '<div class="rev-no-data" style="grid-column:1/-1">No hay datos de resumen por a\u00F1o.</div>';
        else
            summCardsEl.innerHTML = Object.entries(ycSumm).sort((a, b) => b[0].localeCompare(a[0])).map(([yr, s]) => {
                const c = YR_COLORS[yr] || {
                    border: 'rgba(111,91,70,.7)',
                    bg: 'rgba(111,91,70,.1)'
                };
                const utilCls = s.utilidad_total >= 0 ? 'text-ok' : 'text-crit';
                return `<div class="rev-mini-card" style="border-left:4px solid ${c.border}"><div class="rev-mini-label">${yr}</div><div class="rev-mini-value">${fmx(s.ingresos_total)}</div><div class="rev-mini-sub">Ingresos totales \u00B7 ${s.meses_con_data} meses</div><div class="rev-mini-sub" style="margin-top:6px">ADR prom: <strong>${fmx(s.adr_promedio)}</strong></div><div class="rev-mini-sub">Occ. prom: <strong>${fmxPct(s.occ_promedio)}</strong></div><div class="rev-mini-sub">RevPAR prom: <strong>${fmx(s.revpar_promedio)}</strong></div><div class="rev-mini-sub ${utilCls}" style="margin-top:4px;font-weight:600">Utilidad: ${fmx(s.utilidad_total)}</div></div>`;
            }).join('');

        function yrDataset(metric) {
            return years.map(yr => {
                const c = YR_COLORS[yr] || {
                    border: 'rgba(111,91,70,.7)',
                    bg: 'rgba(111,91,70,.1)'
                };
                const vals = Array.from({
                    length: 12
                }, (_, i) => {
                    const mo = ycData[yr]?.[i + 1];
                    return mo ? +(mo[metric] || 0) : null;
                });
                return {
                    label: yr,
                    data: vals,
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    tension: .4,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true
                };
            });
        }
        const lineOpts = (yFmt) => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#6c6052',
                        font: {
                            size: 11
                        },
                        boxWidth: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        label: c => `${c.dataset.label}: ${yFmt === '$' ? fmx(c.raw) : fmxPct(c.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#938574',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: '#938574',
                        font: {
                            size: 10
                        },
                        callback: v => yFmt === '$' ? fmx(v) : v + '%'
                    },
                    grid: {
                        color: 'rgba(198,178,147,.15)'
                    }
                }
            }
        });
        if (!years.length)
            ['chart-ycomp-adr', 'chart-ycomp-occ', 'chart-ycomp-revpar'].forEach(id => {
                const el = document.getElementById(id);
                if (el)
                    el.parentElement.innerHTML = '<div class="rev-no-data">No hay datos de comparaci\u00F3n anual.</div>';
            });
        else {
            const buildYComp = (id, winKey, metric, fmt) => {
                const ctx = document.getElementById(id);
                if (!ctx)
                    return;
                if (window[winKey])
                    window[winKey].destroy();
                window[winKey] = new Chart(ctx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: mLabels,
                        datasets: yrDataset(metric)
                    },
                    options: lineOpts(fmt)
                });
            };
            buildYComp('chart-ycomp-adr', '_chartYcompAdr', 'adr', '$');
            buildYComp('chart-ycomp-occ', '_chartYcompOcc', 'occ', '%');
            buildYComp('chart-ycomp-revpar', '_chartYcompRevpar', 'revpar', '$');
        }
        const ctxGross = document.getElementById('chart-ycomp-gross');
        if (ctxGross && Object.keys(ycSumm).length) {
            const yrLabels = Object.keys(ycSumm).sort();
            if (window._chartYcompGross)
                window._chartYcompGross.destroy();
            window._chartYcompGross = new Chart(ctxGross.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: yrLabels,
                    datasets: [{
                        label: 'Ingresos Brutos',
                        data: yrLabels.map(y => ycSumm[y].ingresos_total || 0),
                        backgroundColor: yrLabels.map(y => (YR_COLORS[y] || {
                            bg: 'rgba(111,91,70,.5)'
                        }).bg.replace('.1)', '.55)')),
                        borderRadius: 6
                    }, {
                        label: 'Utilidad',
                        data: yrLabels.map(y => ycSumm[y].utilidad_total || 0),
                        backgroundColor: yrLabels.map(y => ycSumm[y].utilidad_total >= 0 ? 'rgba(79,107,77,.6)' : 'rgba(138,75,71,.5)'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#6c6052',
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#938574',
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            ticks: {
                                color: '#938574',
                                font: {
                                    size: 10
                                },
                                callback: v => fmx(v)
                            },
                            grid: {
                                color: 'rgba(198,178,147,.15)'
                            }
                        }
                    }
                }
            });
        }
        else if (ctxGross)
            ctxGross.parentElement.innerHTML = '<div class="rev-no-data">Sin datos de resumen anual.</div>';
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       INVENTORY
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    function switchInventoryTab(name, btn) {
        document.querySelectorAll('.inv-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.inv-tab-panel').forEach(p => p.classList.remove('active'));
        if (btn)
            btn.classList.add('active');
        const panel = document.getElementById('inventory-panel-' + name);
        if (panel)
            panel.classList.add('active');
    }

    function invNum(v) {
        if (v === null || v === undefined || v === '')
            return 0;
        if (typeof v === 'number')
            return isFinite(v) ? v : 0;
        const n = Number(String(v).replace(/[$,\s]/g, '').replace('%', ''));
        return isNaN(n) ? 0 : n;
    }

    function invText(v) {
        return (v === null || v === undefined || v === '') ? '\u2014' : String(v);
    }

    function invEscape(v) {
        return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function normalizeInventoryProducts(rows) {
        return (rows || []).map(p => ({
            product: invText(p.product || p.producto).trim(),
            category: invText(p.category || p.categoria || 'Sin categor\u00EDa').trim(),
            unit: invText(p.unit || p.unidad).trim(),
            stock: invNum(p.stock || p.stock_actual || p.stockActual),
            par: invNum(p.par || p.nivel_par || p.nivelPar || p.stock_minimo),
            last_updated: invText(p.last_updated || p.ultima_actualizacion || p.ultimaActualizacion),
            unit_price: invNum(p.unit_price || p.precio_unitario || p.precioUnitario),
            unit_price_display: (p.unit_price_display !== undefined && p.unit_price_display !== null) ? p.unit_price_display : ''
        })).filter(p => p.product && p.product !== '\u2014');
    }

    function loadInventory() {
        const body = document.getElementById('inventory-body');
        if (body)
            body.innerHTML = '<tr><td colspan="10" class="loading">Cargando datos del inventario...</td></tr>';

        const cardsEl = document.getElementById('inventory-cards');
        const catEl = document.getElementById('inventory-category-grid');
        if (cardsEl)
            cardsEl.innerHTML = '<div class="rev-no-data">Cargando productos...</div>';
        if (catEl)
            catEl.innerHTML = '<div class="rev-no-data">Cargando categor\u00EDas...</div>';

        google.script.run
        .withSuccessHandler(function(data) {
            allProducts = normalizeInventoryProducts(data);
            if (currentFilter !== 'all' && !allProducts.some(p => p.category === currentFilter))
                currentFilter = 'all';

            const lastRefresh = document.getElementById('last-refresh');
            if (lastRefresh)
                lastRefresh.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

            renderInventoryCategoryFilters();
            renderTable(currentFilter);
            renderInventoryCards(currentFilter);
            renderCategoryDashboard();
            populatePurchaseProducts();
            populateBreakfastDishes();
            onInventoryTypeChange();

            const pd = document.getElementById('purchase-date');
            const bd = document.getElementById('breakfast-date');
            if (pd && !pd.value)
                pd.value = todayInputValue();
            if (bd && !bd.value)
                bd.value = todayInputValue();
        })
        .withFailureHandler(function(err) {
            const msg = err && err.message ? err.message : 'Error cargando datos.';
            if (body)
                body.innerHTML = '<tr><td colspan="10" class="loading">' + invEscape(msg) + '</td></tr>';
            if (cardsEl)
                cardsEl.innerHTML = '<div class="rev-no-data">' + invEscape(msg) + '</div>';
            if (catEl)
                catEl.innerHTML = '<div class="rev-no-data">' + invEscape(msg) + '</div>';
        })
        .getInventoryData();
    }

    function calc(p) {
        const par = invNum(p.par);
        const stock = invNum(p.stock);
        const daily = par > 0 ? par / 7 : 0;
        const target = Math.ceil(daily * (P + L) * SF);
        const order = Math.max(0, target - stock);
        return {
            daily: daily.toFixed(2),
            target,
            order
        };
    }

    function statusOf(p) {
        const stock = invNum(p.stock);
        const {target} = calc(p);

        if (target <= 0)
            return stock > 0 ? 'ok' : 'crit';
        if (stock >= target)
            return 'ok';
        if (stock >= target * .5)
            return 'low';
        return 'crit';
    }

    function fmt(n) {
        return '$' + invNum(n).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function renderTable(filter) {
        const body = document.getElementById('inventory-body');
        if (!body)
            return;

        const data = filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter);
        updateInventoryStats();
        updateCostSummary(allProducts);

        if (!data.length) {
            body.innerHTML = '<tr><td colspan="10" class="loading">No hay productos para mostrar.</td></tr>';
            return;
        }

        body.innerHTML = data.map(p => {
            const {daily, target, order} = calc(p);
            const st = statusOf(p);
            const label = st === 'ok' ? 'OK' : st === 'low' ? 'Bajo' : 'Cr\u00EDtico';
            const hasCost = p.unit_price > 0 && order > 0;
            const priceLabel = p.unit_price > 0 ? fmt(p.unit_price) : (String(p.unit_price_display || '').trim() ? invEscape(p.unit_price_display) : '<span class="no-price">Sin precio</span>');

            return `
            <tr>
                <td class="primary-cell">${
            invEscape(p.product)}</td>
                <td><span class="cat-badge">${invEscape(p.category || 'Sin categor\u00EDa')}</span></td>
                <td>${invEscape(p.unit)}</td>
                <td>${invNum(p.stock).toLocaleString('es-MX', {maximumFractionDigits: 2})}</td>
                <td>${invNum(p.par).toLocaleString('es-MX', {maximumFractionDigits: 2})}</td>
                <td>${daily}</td>
                <td>
                    <span class="order-qty">${
            order.toLocaleString('es-MX', {maximumFractionDigits: 0})}</span>
                    <span class="formula-note">Objetivo: ${target.toLocaleString('es-MX', {maximumFractionDigits: 0})}</span>
                </td>
                <td>${
            priceLabel}</td>
                <td>${hasCost ? '<span class="cost-cell">' + fmt(order * p.unit_price) + '</span>' : '<span class="no-price">\u2014</span>'}</td>
                <td><span class="status-badge ${st}">${label}</span></td>
            </tr>
        `

            ;
        }).join('');
    }

    function updateInventoryStats() {
        const total = allProducts.length;
        const ok = allProducts.filter(p => statusOf(p) === 'ok').length;
        const low = allProducts.filter(p => statusOf(p) === 'low').length;
        const crit = allProducts.filter(p => statusOf(p) === 'crit').length;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = val;
        };
        set('stat-total', total);
        set('stat-ok', ok);
        set('stat-low', low);
        set('stat-crit', crit);
    }

    function updateCostSummary(data) {
        let tot = 0,
            wp = 0,
            wop = 0,
            pto = 0;

        (data || []).forEach(p => {
            const {order} = calc(p);
            if (order > 0) {
                pto++;
                if (p.unit_price > 0) {
                    tot += order * p.unit_price;
                    wp++;
                } else {
                    wop++;
                }
            }
        });

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = val;
        };
        set('cost-total', fmt(tot));
        set('cost-known', wp);
        set('cost-unknown', wop);
        set('cost-total-products', pto);
    }

    function renderInventoryCategoryFilters() {
        const wrap = document.getElementById('inventory-category-filters');
        if (!wrap)
            return;

        const cats = [...new Set((allProducts || []).map(p => p.category || 'Sin categor\u00EDa'))]
        .sort((a, b) => a.localeCompare(b));

        const buttons = [
        `<button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="filterCat('all',this)">Todos</button>`
        ];

        cats.forEach(cat => {
            const active = currentFilter === cat ? 'active' : '';
            const safeCat = String(cat).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            buttons.push(`<button class="filter-btn ${active}" onclick="filterCat('${safeCat}',this)">${invEscape(cat)}</button>`);
        });

        wrap.innerHTML = buttons.join('');
    }

    function renderCategoryDashboard() {
        const wrap = document.getElementById('inventory-category-grid');
        if (!wrap)
            return;

        if (!allProducts.length) {
            wrap.innerHTML = '<div class="rev-no-data">Sin datos de inventario.</div>';
            return;
        }

        const grouped = {};
        allProducts.forEach(p => {
            const cat = p.category || 'Sin categor\u00EDa';
            if (!grouped[cat])
                grouped[cat] = {
                    items: 0,
                    low: 0,
                    crit: 0,
                    order: 0,
                    cost: 0
                };
            grouped[cat].items++;
            const st = statusOf(p);
            const order = calc(p).order;
            if (st === 'low')
                grouped[cat].low++;
            if (st === 'crit')
                grouped[cat].crit++;
            grouped[cat].order += order;
            if (p.unit_price > 0)
                grouped[cat].cost += order * p.unit_price;
        });

        wrap.innerHTML = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, info]) => `
        <div class="inv-category-card">
            <strong>${
        invEscape(cat)}</strong>
            <span>${info.items} producto(s)</span>
            <span>${info.low} bajo \u00B7 ${info.crit} cr\u00EDtico</span>
            <span>Pedido sugerido: ${info.order.toFixed(0)} unidades</span>
            <span>Costo estimado: ${fmt(info.cost)}</span>
        </div>
    `

        ).join('');
    }

    function renderInventoryCards(filter) {
        const wrap = document.getElementById('inventory-cards');
        if (!wrap)
            return;

        const data = filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter);

        if (!data.length) {
            wrap.innerHTML = '<div class="rev-no-data">No hay productos en esta categor\u00EDa.</div>';
            return;
        }

        wrap.innerHTML = data.map(p => {
            const {daily, target, order} = calc(p);
            const st = statusOf(p);
            const label = st === 'ok' ? 'OK' : st === 'low' ? 'Bajo' : 'Cr\u00EDtico';
            const hasCost = p.unit_price > 0 && order > 0;

            return `
            <div class="inv-product-card">
                <div class="inv-product-top">
                    <div>
                        <div class="inv-product-name">${


            invEscape(p.product)}</div>
                        <span class="cat-badge" style="margin-top:8px;">${invEscape(p.category || 'Sin categor\u00EDa')}</span>
                    </div>
                    <span class="status-badge ${
            st}">${label}</span>
                </div>
                <div class="inv-product-meta">
                    <div><span>Unidad</span><strong>${

            invEscape(p.unit)}</strong></div>
                    <div><span>Stock actual</span><strong>${invNum(p.stock).toLocaleString('es-MX', {maximumFractionDigits: 2})}</strong></div>
                    <div><span>Nivel par</span><strong>${invNum(p.par).toLocaleString('es-MX', {maximumFractionDigits: 2})}</strong></div>
                    <div><span>Uso diario</span><strong>${daily}</strong></div>
                    <div><span>Pedido sugerido</span><strong>${order.toLocaleString('es-MX', {maximumFractionDigits: 0})} ${invEscape(p.unit)}</strong></div>
                    <div><span>Costo estimado</span><strong>${hasCost ? fmt(order * p.unit_price) : '\u2014'}</strong></div>
                </div>
            </div>`

            ;
        }).join('');
    }

    function todayInputValue() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function onInventoryTypeChange() {
        const typeEl = document.getElementById('purchase-type');
        if (!typeEl)
            return;

        const type = typeEl.value;
        const purchaseOnly = document.querySelectorAll('.movement-purchase-only');
        const useOnly = document.querySelectorAll('.movement-use-only');
        const btn = document.getElementById('purchase-submit-btn');

        if (type === 'uso') {
            purchaseOnly.forEach(el => el.style.display = 'none');
            useOnly.forEach(el => el.style.display = '');
            if (btn)
                btn.textContent = 'Registrar uso';
        } else {
            purchaseOnly.forEach(el => el.style.display = '');
            useOnly.forEach(el => el.style.display = 'none');
            if (btn)
                btn.textContent = 'Registrar compra';
        }
    }

    function populatePurchaseProducts() {
        const select = document.getElementById('purchase-product');
        if (!select)
            return;

        const current = select.value;
        const rows = (allProducts || []).slice().sort((a, b) => String(a.product).localeCompare(String(b.product)));

        select.innerHTML = '<option value="">Selecciona un producto...</option>' +
        rows.map(p => `<option value="${invEscape(p.product)}">${invEscape(p.product)}</option>`).join('');

        if (current && rows.some(p => p.product === current))
            select.value = current;
    }

    function onPurchaseProductChange() {
        const productEl = document.getElementById('purchase-product');
        const unitInput = document.getElementById('purchase-unit');
        if (!productEl || !unitInput)
            return;

        const product = productEl.value;
        const found = (allProducts || []).find(p => String(p.product).trim() === String(product).trim());
        unitInput.value = found ? found.unit : '';
    }


    function populateBreakfastDishes() {
        const select = document.getElementById('breakfast-dish');
        if (!select)
            return;

        google.script.run
        .withSuccessHandler(function(dishes) {
            const names = Object.keys(dishes || {}).sort();
            if (!names.length) {
                select.innerHTML = '<option value="">No hay platillos en Recetas</option>';
                return;
            }

            const current = select.value;
            select.innerHTML = '<option value="">Selecciona un platillo...</option>' +
            names.map(name => `<option value="${String(name).replace(/"/g, '&quot;')}">${name}</option>`).join('');
            if (current)
                select.value = current;
        })
        .withFailureHandler(function() {
            select.innerHTML = '<option value="">Error cargando Recetas</option>';
        })
        .getRecipes();
    }

    function resetMovementForm() {
        document.getElementById('purchase-type').value = 'compras';
        document.getElementById('purchase-product').value = '';
        document.getElementById('purchase-unit').value = '';
        document.getElementById('purchase-qty').value = '';
        document.getElementById('purchase-total').value = '';
        document.getElementById('purchase-supplier').value = '';
        document.getElementById('purchase-where').value = '';
        document.getElementById('purchase-date').value = todayInputValue();
        document.getElementById('purchase-notes').value = '';
        onInventoryTypeChange();
    }

    function logPurchase() {
        const type = document.getElementById('purchase-type').value;
        const product = document.getElementById('purchase-product').value;
        const qty = parseFloat(document.getElementById('purchase-qty').value);
        const total = parseFloat(document.getElementById('purchase-total').value);
        const supplier = document.getElementById('purchase-supplier').value.trim();
        const donde = document.getElementById('purchase-where').value.trim();
        const date = document.getElementById('purchase-date').value;
        const notes = document.getElementById('purchase-notes').value.trim();
        const status = document.getElementById('purchase-status');
        const btn = document.getElementById('purchase-submit-btn');

        if (!product) {
            status.textContent = 'Selecciona un producto.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!qty || qty <= 0) {
            status.textContent = 'Ingresa una cantidad v\u00E1lida.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!date) {
            status.textContent = 'Selecciona la fecha.';
            status.className = 'breakfast-status error';
            return;
        }

        if (type === 'compras') {
            if (!total || total <= 0) {
                status.textContent = 'Para compras, ingresa un monto total v\u00E1lido.';
                status.className = 'breakfast-status error';
                return;
            }
            if (!supplier) {
                status.textContent = 'Para compras, ingresa el proveedor.';
                status.className = 'breakfast-status error';
                return;
            }
        }

        btn.disabled = true;
        status.textContent = type === 'uso' ? 'Registrando uso...' : 'Registrando compra...';
        status.className = 'breakfast-status';

        google.script.run
        .withSuccessHandler(function(result) {
            if (result && result.success) {
                status.textContent = type === 'uso'
                ? `\u2713 Uso registrado para ${product}.`
                : `\u2713 Compra registrada para ${product}. Precio unitario: ${fmx(result.unit_price || 0)}.`;
                status.className = 'breakfast-status success';
                resetMovementForm();
                setTimeout(() => loadInventory(), 1000);
            } else {
                status.textContent = 'Error: ' + ((result && result.error) || 'No se pudo registrar.');
                status.className = 'breakfast-status error';
            }
            btn.disabled = false;
        })
        .withFailureHandler(function(err) {
            status.textContent = 'Error al registrar movimiento: ' + (err && err.message ? err.message : '');
            status.className = 'breakfast-status error';
            btn.disabled = false;
        })
        .logInventoryMovement(type, product, qty, total || '', supplier || '', date, notes || '', donde || '');
    }

    function logBreakfast() {
        const dish = document.getElementById('breakfast-dish').value;
        const portions = parseInt(document.getElementById('breakfast-portions').value, 10);
        const date = document.getElementById('breakfast-date').value;
        const status = document.getElementById('breakfast-status');
        const btn = document.getElementById('breakfast-submit-btn');

        if (!dish) {
            status.textContent = 'Selecciona un platillo.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!portions || portions < 1) {
            status.textContent = 'Ingresa el n\u00FAmero de porciones.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!date) {
            status.textContent = 'Selecciona la fecha.';
            status.className = 'breakfast-status error';
            return;
        }

        btn.disabled = true;
        status.textContent = 'Registrando desayuno y descontando ingredientes...';
        status.className = 'breakfast-status';

        google.script.run
        .withSuccessHandler(function(result) {
            if (result && result.success) {
                status.textContent = `\u2713 Desayuno registrado. Se descontaron ${result.ingredientsLogged || 0} ingrediente(s).`;
                status.className = 'breakfast-status success';
                document.getElementById('breakfast-dish').value = '';
                document.getElementById('breakfast-portions').value = '';
                document.getElementById('breakfast-date').value = todayInputValue();
                setTimeout(() => loadInventory(), 1000);
            } else {
                status.textContent = 'Error: ' + ((result && result.error) || 'No se pudo registrar el desayuno.');
                status.className = 'breakfast-status error';
            }
            btn.disabled = false;
        })
        .withFailureHandler(function(err) {
            status.textContent = 'Error al registrar desayuno: ' + (err && err.message ? err.message : '');
            status.className = 'breakfast-status error';
            btn.disabled = false;
        })
        .logdesayuno(dish, portions, date);
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       MAINTENANCE
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    let allMaintData = [],
        maintStatusFilter = 'all',
        maintAreaFilter = 'all';

    function updateMaintItems() {
        const area = document.getElementById('maint-area').value;
        const select = document.getElementById('maint-item');
        const roomItems = ['AC / Ventilation', 'Furniture & Fixtures', 'Doors & Locks', 'Bathroom Fixtures', 'TV', 'Remotes'];
        const areaMap = {
            'Pool': ['Pool Cleaning / Vacuuming', 'Water pH / Chemicals'],
            'Restaurant': ['Deep Cleaning'],
            'Laundry Room': ['Washing Machines', 'Dryers', 'Water Heater'],
            'Common Areas': ['Garden / Landscaping', 'Lighting', 'Hallway Furniture', 'Entrance / Lobby', 'Stairs', 'Wall Painting']
        };
        const items = area.startsWith('Room') ? roomItems : (areaMap[area] || []);
        select.innerHTML = items.length
        ? '<option value="">Selecciona un item...</option>' + items.map(i => `<option>${i}</option>`).join('')
        : '<option value="">Selecciona \u00E1rea primero...</option>';
    }

    function loadMaintenance() {
        document.getElementById('maintenance-body').innerHTML = '<tr><td colspan="7" class="loading">Cargando mantenimiento...</td></tr>';
        google.script.run
        .withSuccessHandler(function(data) {
            allMaintData = data;
            document.getElementById('maint-refresh').textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-MX');
            renderMaintenance();
        })
        .withFailureHandler(function() {
            document.getElementById('maintenance-body').innerHTML = '<tr><td colspan="7" class="loading">Error cargando datos.</td></tr>';
        })
        .getMaintenanceStatus();
    }

    function renderMaintenance() {
        let data = allMaintData;
        if (maintStatusFilter !== 'all')
            data = data.filter(d => d.status === maintStatusFilter);
        if (maintAreaFilter !== 'all')
            data = data.filter(d => d.area.startsWith(maintAreaFilter));
        const tbody = document.getElementById('maintenance-body');
        tbody.innerHTML = '';
        data.forEach(d => {
            const stMap = {
                ok: 'ok',
                due_soon: 'low',
                overdue: 'crit',
                never: 'crit'
            };
            const stLabel = {
                ok: 'OK',
                due_soon: 'Pronto',
                overdue: 'Vencido',
                never: 'Sin registro'
            };
            const st = stMap[d.status] || 'crit';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><span class="cat-badge">${d.area}</span></td><td><span class="primary-cell">${d.item}</span></td><td>${d.interval} d\u00EDas</td><td>${d.last_done}</td><td>${d.next_due}</td><td>${d.done_by}</td><td><span class="status-badge ${st}">${stLabel[d.status]}</span></td>`;
            tbody.appendChild(tr);
        });
        if (data.length === 0)
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No hay items en esta categor\u00EDa.</td></tr>';
        document.getElementById('mstat-total').textContent = allMaintData.length;
        document.getElementById('mstat-ok').textContent = allMaintData.filter(d => d.status === 'ok').length;
        document.getElementById('mstat-soon').textContent = allMaintData.filter(d => d.status === 'due_soon').length;
        document.getElementById('mstat-overdue').textContent = allMaintData.filter(d => d.status === 'overdue' || d.status === 'never').length;
    }

    function filterMaint(f, btn) {
        maintStatusFilter = f;
        document.querySelectorAll('#maint-status-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMaintenance();
    }

    function filterMaintArea(f, btn) {
        maintAreaFilter = f;
        document.querySelectorAll('#area-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMaintenance();
    }

    function logMaintenance() {
        const area = document.getElementById('maint-area').value;
        const item = document.getElementById('maint-item').value;
        const doneBy = document.getElementById('maint-doneby').value;
        const date = document.getElementById('maint-date').value;
        const notes = document.getElementById('maint-notes').value;
        const status = document.getElementById('maint-status');
        const btn = document.getElementById('maintenance-submit-btn');
        if (!area) {
            status.textContent = 'Selecciona un \u00E1rea.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!item) {
            status.textContent = 'Selecciona un item.';
            status.className = 'breakfast-status error';
            return;
        }
        if (!date) {
            status.textContent = 'Selecciona la fecha.';
            status.className = 'breakfast-status error';
            return;
        }
        btn.disabled = true;
        status.textContent = 'Registrando...';
        status.className = 'breakfast-status';
        google.script.run
        .withSuccessHandler(function(result) {
            if (result.success) {
                status.textContent = `\u2713 ${item} en ${area} registrado. Pr\u00F3ximo: ${result.next_due}`;
                status.className = 'breakfast-status success';
                document.getElementById('maint-area').value = '';
                document.getElementById('maint-item').innerHTML = '<option value="">Selecciona \u00E1rea primero...</option>';
                document.getElementById('maint-doneby').value = '';
                document.getElementById('maint-date').value = '';
                document.getElementById('maint-notes').value = '';
                setTimeout(() => loadMaintenance(), 1500);
            } else {
                status.textContent = 'Error: ' + result.error;
                status.className = 'breakfast-status error';
            }
            btn.disabled = false;
        })
        .withFailureHandler(function() {
            status.textContent = 'Error al registrar.';
            status.className = 'breakfast-status error';
            btn.disabled = false;
        })
        .logMaintenance(area, item, doneBy, notes, date);
    }

    function filterCat(cat, btn) {
        currentFilter = cat;
        document.querySelectorAll('#inventory-category-filters .filter-btn').forEach(b => b.classList.remove('active'));
        if (btn)
            btn.classList.add('active');
        renderTable(cat);
        renderInventoryCards(cat);
    }

    /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       CAJA RECEPCI\u00D3N
    \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
    let cashData = null;
    let cashFinanceRows = [];

    function cashTodayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function cashMoney(n) {
        if (n == null || isNaN(n))
            return '\u2014';
        return '$' + Number(n).toLocaleString('es-MX', {
            maximumFractionDigits: 0
        });
    }

    function cashSignedMoney(row, hidePayroll) {
        if (hidePayroll && currentRole !== 'finance' && String(row.tipo || '').toUpperCase() === 'NOMINAS')
            return 'Oculto para recepci\u00F3n';
        const sign = row.movimiento === 'entrada' ? '+' : '-';
        return sign + cashMoney(row.monto);
    }

    function cashSetStatus(id, msg, ok) {
        const el = document.getElementById(id);
        if (!el)
            return;
        el.textContent = msg || '';
        el.className = 'breakfast-status' + (ok === true ? ' success' : ok === false ? ' error' : '');
    }

    function showCashError(message) {
        const box = document.getElementById('cash-error-box');
        if (!box)
            return;
        if (!message) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }
        box.style.display = 'block';
        box.innerHTML = `<div class="rev-error"><strong>${message}</strong></div>`;
    }

    function cashTab(name, btn) {
        if (name === 'finance' && currentRole !== 'finance') {
            alert('Acceso restringido. Usa la contrase\u00F1a de finanzas.');
            return;
        }
        document.querySelectorAll('.cash-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.cash-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('cashpanel-' + name);
        if (panel)
            panel.classList.add('active');
        if (name === 'finance')
            loadCashAdminDate();
    }

    function loadCash(selectedDate) {
        showCashError('');
        const user = currentCashUser || (currentRole === 'finance' ? 'Finanzas' : 'Recepci\u00F3n');
        document.getElementById('cash-role-chip').textContent = currentRole === 'finance' ? 'Rol: finanzas' : 'Rol: recepci\u00F3n';
        document.getElementById('cash-user-chip').textContent = 'Usuario: ' + user;
        document.getElementById('cash-user-fixed').value = user;
        const adminUser = document.getElementById('cash-admin-user');
        if (adminUser)
            adminUser.value = user;
        if (currentRole === 'finance')
            document.body.classList.add('cash-finance');
        else
            document.body.classList.remove('cash-finance');

        google.script.run
        .withSuccessHandler(function(data) {
            if (!data || data.success === false) {
                showCashError((data && data.error) || 'No se pudo cargar Caja.');
                return;
            }
            cashData = data;
            renderCashToday(data);
            if (currentRole === 'finance') {
                const fd = document.getElementById('cash-fin-date');
                const ad = document.getElementById('cash-admin-date');
                if (fd && !fd.value)
                    fd.value = data.today;
                if (ad && !ad.value)
                    ad.value = data.today;
                renderCashFinance(data);
            }
        })
        .withFailureHandler(function(err) {
            showCashError('Error al cargar Caja: ' + (err && err.message ? err.message : String(err)));
        })
        .getCashPayload(currentRole, selectedDate || '', user);
    }

    function renderCashToday(data) {
        const s = data.today_summary || {};
        document.getElementById('cash-date-chip').textContent = 'Hoy \u00B7 ' + (data.today || '');
        document.getElementById('cash-saldo-inicial').textContent = cashMoney(s.saldo_inicial);
        document.getElementById('cash-entradas-caja').textContent = cashMoney(s.entradas_caja);
        document.getElementById('cash-gastos-caja').textContent = cashMoney(s.gastos_caja);
        document.getElementById('cash-balance-caja').textContent = cashMoney(s.saldo_cierre);
        document.getElementById('cash-close-summary').textContent = `Balance de caja registrado: ${cashMoney(s.saldo_cierre)} \u00B7 Entradas caja: ${cashMoney(s.entradas_caja)} \u00B7 Gastos caja: ${cashMoney(s.gastos_caja)}`;
        document.getElementById('cash-close-title').textContent = s.cerrado ? 'Caja cerrada' : 'Cierre pendiente';
        document.getElementById('cash-open-chip').textContent = s.cerrado ? 'Caja cerrada' : 'Caja abierta';
        document.getElementById('cash-submit-btn').disabled = !!s.cerrado && currentRole !== 'finance';
        document.getElementById('cash-close-btn').disabled = !!s.cerrado;
        renderCashTodayTable(data.today_movements || [], !!s.cerrado);
    }

    function renderCashTodayTable(rows, closed) {
        const tbody = document.getElementById('cash-today-body');
        const count = document.getElementById('cash-today-count');
        if (count)
            count.textContent = `${rows.length} movimientos`;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Sin movimientos registrados hoy.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => {
            const cancelado = String(r.estado || '').toLowerCase() === 'cancelado';
            const badge = r.cuenta === 'banco' ? 'bank' : 'cash';
            const amount = cashSignedMoney(r, true);
            const amountCls = String(amount).includes('Oculto') ? 'cash-hidden-amount' : (r.movimiento === 'entrada' ? 'text-ok' : 'text-crit');
            const action = (!cancelado && !closed) ? `<button class="btn-reject" onclick="cancelCashMovement('${r.movimiento_id || ''}')">Cancelar</button>` : (cancelado ? (r.motivo_cancelacion || 'Cancelado') : 'Cerrado');
            return `<tr class="${cancelado ? 'cash-cancelled' : ''}">
            <td>${r.hora || '\u2014'}</td>
            <td><span class="cash-badge ${badge}">${r.cuenta === 'banco' ? 'Banco' : 'Caja'}</span></td>
            <td>${r.tipo || '\u2014'}</td>
            <td class="primary-cell">${r.concepto || '\u2014'}</td>
            <td class="${amountCls}">${amount}</td>
            <td><span class="cash-badge ${cancelado ? 'cancel' : 'cash'}">${cancelado ? 'Cancelado' : 'Activo'}</span></td>
            <td>${action}</td>
        </tr>`
            ;
        }).join('');
    }

    function clearCashForm() {
        ['cash-amount', 'cash-concept'].forEach(id => {
            const el = document.getElementById(id);
            if (el)
                el.value = '';
        });
        cashSetStatus('cash-form-status', '', null);
    }

    function submitCashMovement() {
        const s = (cashData && cashData.today_summary) || {};
        if (s.cerrado && currentRole !== 'finance') {
            cashSetStatus('cash-form-status', 'La caja ya est\u00E1 cerrada. No puedes registrar movimientos hasta ma\u00F1ana.', false);
            return;
        }
        const payload = {
            fecha: cashData ? cashData.today : cashTodayStr(),
            cuenta: document.getElementById('cash-account').value,
            movimiento: document.getElementById('cash-movement').value,
            tipo: document.getElementById('cash-type').value,
            monto: document.getElementById('cash-amount').value,
            concepto: document.getElementById('cash-concept').value,
            registrado_por: currentCashUser || 'Recepci\u00F3n'
        };
        if (!payload.monto || Number(payload.monto) <= 0) {
            cashSetStatus('cash-form-status', 'Pon un monto v\u00E1lido.', false);
            return;
        }
        if (!payload.concepto) {
            cashSetStatus('cash-form-status', 'Escribe el concepto.', false);
            return;
        }
        const btn = document.getElementById('cash-submit-btn');
        btn.disabled = true;
        cashSetStatus('cash-form-status', 'Registrando...', null);
        google.script.run
        .withSuccessHandler(function(res) {
            btn.disabled = false;
            if (!res || !res.success) {
                cashSetStatus('cash-form-status', (res && res.error) || 'No se pudo registrar.', false);
                return;
            }
            cashSetStatus('cash-form-status', '\u2713 Movimiento registrado.', true);
            clearCashForm();
            loadCash();
        })
        .withFailureHandler(function(err) {
            btn.disabled = false;
            cashSetStatus('cash-form-status', 'Error: ' + (err && err.message ? err.message : String(err)), false);
        })
        .addCashMovement(payload, currentRole);
    }

    function submitCashAdminMovement() {
        if (currentRole !== 'finance')
            return alert('Acceso restringido.');
        const payload = {
            fecha: document.getElementById('cash-admin-date').value,
            cuenta: document.getElementById('cash-admin-account').value,
            movimiento: document.getElementById('cash-admin-movement').value,
            tipo: document.getElementById('cash-admin-type').value,
            monto: document.getElementById('cash-admin-amount').value,
            concepto: document.getElementById('cash-admin-concept').value,
            registrado_por: currentCashUser || 'Finanzas'
        };
        if (!payload.fecha) {
            cashSetStatus('cash-admin-status', 'Selecciona fecha.', false);
            return;
        }
        if (!payload.monto || Number(payload.monto) <= 0) {
            cashSetStatus('cash-admin-status', 'Pon un monto v\u00E1lido.', false);
            return;
        }
        if (!payload.concepto) {
            cashSetStatus('cash-admin-status', 'Escribe el concepto.', false);
            return;
        }
        cashSetStatus('cash-admin-status', 'Registrando...', null);
        google.script.run
        .withSuccessHandler(function(res) {
            if (!res || !res.success) {
                cashSetStatus('cash-admin-status', (res && res.error) || 'No se pudo registrar.', false);
                return;
            }
            cashSetStatus('cash-admin-status', '\u2713 Movimiento admin registrado.', true);
            document.getElementById('cash-admin-amount').value = '';
            document.getElementById('cash-admin-concept').value = '';
            loadCashAdminDate();
            loadCash();
        })
        .withFailureHandler(function(err) {
            cashSetStatus('cash-admin-status', 'Error: ' + (err && err.message ? err.message : String(err)), false);
        })
        .addCashMovement(payload, currentRole);
    }

    function cancelCashMovement(id) {
        if (!id)
            return;
        const motivo = prompt('Motivo de cancelaci\u00F3n:');
        if (motivo === null)
            return;
        if (!String(motivo).trim()) {
            alert('Necesitas escribir un motivo.');
            return;
        }
        google.script.run
        .withSuccessHandler(function(res) {
            if (!res || !res.success) {
                alert((res && res.error) || 'No se pudo cancelar.');
                return;
            }
            loadCash();
        })
        .withFailureHandler(function(err) {
            alert('Error: ' + (err && err.message ? err.message : String(err)));
        })
        .cancelCashMovement(id, motivo, currentCashUser || 'Recepci\u00F3n', currentRole);
    }

    function closeCashDay() {
        const answer = prompt('Para cerrar caja escribe: cerrar');
        if (answer === null)
            return;
        if (String(answer).trim().toLowerCase() !== 'cerrar') {
            alert('Confirmaci\u00F3n incorrecta. No se cerr\u00F3 la caja.');
            return;
        }
        google.script.run
        .withSuccessHandler(function(res) {
            if (!res || !res.success) {
                alert((res && res.error) || 'No se pudo cerrar caja.');
                return;
            }
            alert('Caja cerrada correctamente.');
            loadCash();
        })
        .withFailureHandler(function(err) {
            alert('Error: ' + (err && err.message ? err.message : String(err)));
        })
        .closeCashDay(currentCashUser || 'Recepci\u00F3n', currentRole);
    }

    function loadCashAdminDate() {
        if (currentRole !== 'finance')
            return;
        const d = document.getElementById('cash-fin-date').value || (cashData && cashData.today) || cashTodayStr();
        google.script.run
        .withSuccessHandler(function(data) {
            cashData = data;
            renderCashToday(data);
            renderCashFinance(data);
        })
        .withFailureHandler(function(err) {
            showCashError('Error al cargar fecha: ' + (err && err.message ? err.message : String(err)));
        })
        .getCashPayload(currentRole, d, currentCashUser || 'Finanzas');
    }

    function cashShiftAdminDate(offset) {
        const input = document.getElementById('cash-fin-date');
        if (!input)
            return;
        if (offset === 0)
            input.value = (cashData && cashData.today) || cashTodayStr();
        else {
            const d = new Date((input.value || cashTodayStr()) + 'T12:00:00');
            d.setDate(d.getDate() + offset);
            input.value = d.toISOString().slice(0, 10);
        }
        loadCashAdminDate();
    }

    function renderCashFinance(data) {
        if (currentRole !== 'finance')
            return;
        const rowsAll = (data.selected_movements || []).slice();
        const account = document.getElementById('cash-fin-account').value || 'all';
        const type = document.getElementById('cash-fin-type').value || 'all';
        const status = document.getElementById('cash-fin-status-filter').value || 'active';
        let rows = rowsAll;
        if (account !== 'all')
            rows = rows.filter(r => r.cuenta === account);
        if (type !== 'all')
            rows = rows.filter(r => String(r.tipo || '') === type);
        if (status === 'active')
            rows = rows.filter(r => String(r.estado || '').toLowerCase() !== 'cancelado');
        if (status === 'cancelado')
            rows = rows.filter(r => String(r.estado || '').toLowerCase() === 'cancelado');
        cashFinanceRows = rows;
        const s = data.selected_summary || {};
        const m = data.metrics_7d || {};
        document.getElementById('cash-fin-in-7').textContent = cashMoney(m.entradas_total);
        document.getElementById('cash-fin-out-7').textContent = cashMoney(m.gastos_total);
        document.getElementById('cash-fin-bank-balance').textContent = cashMoney(data.bank_balance);
        document.getElementById('cash-fin-close-balance').textContent = cashMoney(s.saldo_cierre);
        document.getElementById('cash-fin-close-sub').textContent = s.cerrado ? `Cerrado por ${s.cerrado_por || '\u2014'} \u00B7 ${s.hora_cierre || '\u2014'}` : 'Cierre pendiente o abierto.';
        renderCashFinanceTable(rows, data.selected_date);
        renderCashBreakdown(rows);
        renderCashCancelled(data.selected_movements || []);
        renderCashClosureBox(s);
    }

    function renderCashFinanceTable(rows, date) {
        const body = document.getElementById('cash-fin-body');
        document.getElementById('cash-fin-count').textContent = `${rows.length} movimientos`;
        document.getElementById('cash-fin-note').textContent = `Fecha seleccionada: ${date || '\u2014'}`;
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="8" class="loading">Sin movimientos para estos filtros.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(r => {
            const cancelado = String(r.estado || '').toLowerCase() === 'cancelado';
            const badge = r.cuenta === 'banco' ? 'bank' : 'cash';
            const amountCls = r.movimiento === 'entrada' ? 'text-ok' : 'text-crit';
            return `<tr class="${cancelado ? 'cash-cancelled' : ''}">
            <td>${r.fecha || '\u2014'}</td><td>${r.hora || '\u2014'}</td>
            <td><span class="cash-badge ${badge}">${r.cuenta === 'banco' ? 'Banco' : 'Caja'}</span></td>
            <td>${r.tipo || '\u2014'}</td><td class="primary-cell">${r.concepto || '\u2014'}</td>
            <td class="${amountCls}">${cashSignedMoney(r, false)}</td><td>${r.registrado_por || '\u2014'}</td>
            <td><span class="cash-badge ${cancelado ? 'cancel' : 'cash'}">${cancelado ? 'Cancelado' : 'Activo'}</span></td>
        </tr>`
            ;
        }).join('');
    }

    function renderCashBreakdown(rows) {
        const box = document.getElementById('cash-fin-breakdown');
        const grouped = {};
        rows.filter(r => String(r.estado || '').toLowerCase() !== 'cancelado').forEach(r => {
            const t = r.tipo || 'SIN TIPO';
            if (!grouped[t])
                grouped[t] = {
                    entrada: 0,
                    gasto: 0,
                    count: 0
                };
            grouped[t][r.movimiento] += Number(r.monto || 0);
            grouped[t].count += 1;
        });
        const entries = Object.entries(grouped).sort((a, b) => (b[1].entrada + b[1].gasto) - (a[1].entrada + a[1].gasto));
        if (!entries.length) {
            box.innerHTML = '<div class="info-box">Sin datos activos para este filtro.</div>';
            return;
        }
        box.innerHTML = entries.map(([tipo, v]) => `<div class="cash-closed-state"><div><strong style="color:var(--text);">${tipo}</strong><span>${v.count} movimiento(s) \u00B7 Entradas ${cashMoney(v.entrada)} \u00B7 Gastos ${cashMoney(v.gasto)}</span></div><span class="chip">${cashMoney(v.entrada - v.gasto)}</span></div>`).join('');
    }

    function renderCashCancelled(rows) {
        const box = document.getElementById('cash-fin-cancelled');
        const cancelled = rows.filter(r => String(r.estado || '').toLowerCase() === 'cancelado');
        if (!cancelled.length) {
            box.innerHTML = '<div class="info-box">No hay movimientos cancelados en esta fecha.</div>';
            return;
        }
        box.innerHTML = cancelled.map(r => `<div class="cash-warning-box"><strong>${r.fecha} \u00B7 ${r.hora || '\u2014'} \u00B7 ${r.tipo || '\u2014'}</strong><br>${r.concepto || '\u2014'} \u00B7 ${cashSignedMoney(r, false)}<br>Cancelado por: <strong>${r.cancelado_por || '\u2014'}</strong> \u00B7 Motivo: <strong>${r.motivo_cancelacion || 'Sin motivo'}</strong></div>`).join('');
    }

    function renderCashClosureBox(s) {
        const box = document.getElementById('cash-fin-closure-box');
        if (!box)
            return;
        box.innerHTML = `<div class="cash-closed-state"><div><strong>${s.cerrado ? 'Cierre registrado' : 'Cierre pendiente'}</strong><span>Saldo inicial ${cashMoney(s.saldo_inicial)} \u00B7 Entradas ${cashMoney(s.entradas_caja)} \u00B7 Gastos ${cashMoney(s.gastos_caja)} \u00B7 Cierre ${cashMoney(s.saldo_cierre)}</span></div><span class="chip">${s.cerrado_por || 'Abierto'}</span></div>`;
    }

    document.addEventListener('DOMContentLoaded', function() {
        try {
            const saved = JSON.parse(localStorage.getItem(HMS_SESSION_KEY) || 'null');
            if (saved && saved.user) {
                finishLogin({ user: saved.user, permissions: saved.permissions || { modules:{}, tabs:{} } }, localStorage.getItem(HMS_LAST_SCREEN_KEY) || 'home');
            }
        } catch(e) {}
        const pd = document.getElementById('purchase-date');
        if (pd && !pd.value)
            pd.value = new Date().toISOString().slice(0, 10);
        const bd = document.getElementById('breakfast-date');
        if (bd && !bd.value)
            bd.value = new Date().toISOString().slice(0, 10);
        const md = document.getElementById('maint-date');
        if (md && !md.value)
            md.value = new Date().toISOString().slice(0, 10);
        const cfd = document.getElementById('cash-fin-date');
        if (cfd && !cfd.value)
            cfd.value = new Date().toISOString().slice(0, 10);
        const cad = document.getElementById('cash-admin-date');
        if (cad && !cad.value)
            cad.value = new Date().toISOString().slice(0, 10);
    });
    

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   USERS ADMIN
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
function loadUsersAdmin() {
  if (!currentUser || !hasModuleAccess('users')) return;
  const list = document.getElementById('users-list');
  if (list) list.innerHTML = '<div class="rev-no-data">Cargando usuarios...</div>';
  renderModuleCheckboxes();
  google.script.run
    .withSuccessHandler(renderUsersAdmin)
    .withFailureHandler(e => { if (list) list.innerHTML = '<div class="rev-error">Error cargando usuarios: ' + (e.message || e) + '</div>'; })
    .getUsersAdminPayload(currentUser.username);
}

function renderModuleCheckboxes() {
  const el = document.getElementById('new-user-modules');
  if (!el) return;
  el.innerHTML = MODULES.filter(m => m.key !== 'home').map(m =>
    `<label class="permission-check"><input type="checkbox" class="new-user-module-check" value="${m.key}" ${m.key==='inventory'||m.key==='maintenance'||m.key==='cash'?'checked':''}> <span class="permission-code">${m.icon}</span> ${m.label}</label>`
  ).join('');
}

function renderUsersAdmin(payload) {
  const list = document.getElementById('users-list');
  if (!payload || !payload.success) {
    list.innerHTML = '<div class="rev-error">' + ((payload && payload.error) || 'No se pudo cargar usuarios.') + '</div>';
    return;
  }
  const users = payload.users || [];
  list.innerHTML = users.map(u =>
    `<div class="user-row-card"><strong>${u.name || u.username}</strong><span>Usuario: ${u.username} \u00B7 Rol: ${u.role} \u00B7 Estado: ${u.active ? 'Activo' : 'Inactivo'}</span><br><span>M\u00F3dulos: ${(u.modules || []).join(', ') || '\u2014'}</span></div>`
  ).join('') || '<div class="rev-no-data">Sin usuarios.</div>';
}

function createUserFromForm() {
  const status = document.getElementById('users-form-status');
  const modules = Array.from(document.querySelectorAll('.new-user-module-check:checked')).map(x => x.value);
  const payload = {
    name: document.getElementById('new-user-name').value.trim(),
    username: document.getElementById('new-user-username').value.trim(),
    password: document.getElementById('new-user-password').value,
    role: document.getElementById('new-user-role').value,
    modules
  };
  if (!payload.name || !payload.username || !payload.password) {
    status.className = 'breakfast-status error';
    status.textContent = 'Nombre, usuario y contrase\u00F1a son obligatorios.';
    return;
  }
  status.className = 'breakfast-status';
  status.textContent = 'Creando usuario...';
  google.script.run
    .withSuccessHandler(res => {
      if (!res || !res.success) {
        status.className = 'breakfast-status error';
        status.textContent = (res && res.error) || 'No se pudo crear usuario.';
        return;
      }
      status.className = 'breakfast-status success';
      status.textContent = 'Usuario creado correctamente.';
      ['new-user-name','new-user-username','new-user-password'].forEach(id => document.getElementById(id).value = '');
      loadUsersAdmin();
    })
    .withFailureHandler(e => {
      status.className = 'breakfast-status error';
      status.textContent = 'Error: ' + (e.message || e);
    })
    .createUserAdmin(payload, currentUser.username);
}