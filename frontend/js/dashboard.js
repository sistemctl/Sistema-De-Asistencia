/* dashboard.js — Dashboard page */

const DashboardPage = {
  chart: null,
  selectedDate: null, // null = hoy

  async render() {
    // Fecha inicial: hoy
    const todayISO = new Date().toISOString().slice(0, 10);
    this.selectedDate = todayISO;

    document.getElementById('pageContent').innerHTML = `
      <!-- Banner de Bienvenida, Fecha y Biométrico -->
      <div class="welcome-banner">
        <div class="welcome-banner-greeting">
          <h2 id="welcomeGreeting">¡Hola!</h2>
          <p id="welcomeSub">Que tengas una excelente jornada laboral hoy.</p>
        </div>
        
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; position: relative; z-index: 2;">
          <!-- Barra de fecha integrada -->
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="dash-date-selector" onclick="document.getElementById('dashDatePicker')._flatpickr?.open()" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(10px);">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span style="font-size:0.82rem;font-weight:600;opacity:0.9;">Viendo datos de:</span>
              <input id="dashDatePicker" class="dash-date-input" placeholder="Seleccionar fecha…" readonly />
            </div>
            <span id="dashDateLabel" style="font-size:.78rem;color:var(--text-3);font-weight:600;background:rgba(var(--accent-rgb),0.06);padding:4px 10px;border-radius:20px;border:1px dashed rgba(var(--accent-rgb),0.2);display:none;"></span>
            <button id="dashGoToday" class="btn btn-secondary btn-sm" style="display:none;border-radius:20px;padding:6px 14px;font-weight:600;">
              ← Volver a hoy
            </button>
          </div>

          <!-- Biometric Badge -->
          <div class="biometric-badge" id="biometricStatusBadge" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(10px);">
            <div class="biometric-indicator offline" id="biometricIndicator"></div>
            <div class="biometric-details">
              <span class="biometric-details-title">Dispositivo Biométrico</span>
              <span class="biometric-details-sub" id="biometricInfo">Cargando estado...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="bento-kpi-grid" id="kpiGrid" style="margin-bottom:24px">
        ${[1,2,3].map(() => `<div class="double-bezel-outer bento-col-2"><div class="double-bezel-inner kpi-card"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-kpi"></div></div></div>`).join('')}
        ${[4,5].map(() => `<div class="double-bezel-outer bento-col-3"><div class="double-bezel-inner kpi-card"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-kpi"></div></div></div>`).join('')}
      </div>

      <!-- Charts + Estado del día -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Asistencia semanal</div><div class="card-sub">Últimos 7 días</div></div></div>
          <div class="chart-container"><canvas id="weeklyChart"></canvas></div>
        </div>
        <div class="card" id="statusCard">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Estado del Día
              </div>
              <div class="card-sub" id="statusDate">Cargando fecha…</div>
            </div>
          </div>
          <div id="statusBody" style="padding:8px 0">
            ${[1,2,3,4].map(() => `
              <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border)">
                <div class="skeleton sk-avatar" style="width:42px;height:42px;border-radius:10px"></div>
                <div style="flex:1"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-text w-25" style="margin-top:6px"></div></div>
              </div>`).join('')}
          </div>
      </div>
      
      <!-- Leaderboard + Info -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="leaderboard-card" id="leaderboardCard">
          <div class="leaderboard-header">
            <div>
              <div class="card-title">🏆 Podio de Puntualidad</div>
              <div class="card-sub">Top 3 colaboradores con mayor asistencia y puntualidad este mes</div>
            </div>
          </div>
          <div id="leaderboardBody" style="display:flex; flex-direction:column; gap:12px;">
            ${[1,2,3].map(() => `<div class="skeleton" style="height:50px; border-radius:12px;"></div>`).join('')}
          </div>
        </div>

        <!-- Actividad en Vivo (Tiempo Real) -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:flex-start; padding: 20px; border: 1px solid var(--border); min-height: 340px; max-height: 380px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
                <span class="live-pulse" style="width: 8px; height: 8px; background: #00e676; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #00e676; animation: pulseGlow 1.5s infinite;"></span>
                Actividad en Vivo
              </div>
              <div class="card-sub">Monitoreo en tiempo real</div>
            </div>
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent); background: rgba(var(--accent-rgb), 0.1); padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Lector</span>
          </div>
          <div id="liveFeedBody" style="display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto; padding-right: 2px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-3); text-align: center; gap: 8px; margin-top: 20px;">
              <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="2" fill="none" style="opacity: 0.6; animation: spin 4s infinite linear;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span style="font-size: 0.8rem; font-weight: 600;">Esperando marcas en vivo...</span>
            </div>
          </div>
          <style>
            @keyframes pulseGlow {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(0, 230, 118, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
            }
          </style>
        </div>
      </div>`;

    // Inicializar Flatpickr en el selector de fecha
    if (window.flatpickr) {
      flatpickr('#dashDatePicker', {
        locale: 'es',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'D d M Y',
        maxDate: 'today',
        defaultDate: todayISO,
        onChange: (selectedDates, dateStr) => {
          this.selectedDate = dateStr;
          const isToday = dateStr === todayISO;
          const label = document.getElementById('dashDateLabel');
          const btn = document.getElementById('dashGoToday');
          if (label) {
            label.textContent = isToday ? '(Hoy)' : '';
            label.style.display = isToday ? 'inline-block' : 'none';
          }
          if (btn) btn.style.display = isToday ? 'none' : 'inline-flex';
          this.reload();
        }
      });
    }

    // Set label inicial
    const initialLabel = document.getElementById('dashDateLabel');
    if (initialLabel) {
      initialLabel.textContent = '(Hoy)';
      initialLabel.style.display = 'inline-block';
    }

    // Botón "Volver a hoy"
    document.getElementById('dashGoToday')?.addEventListener('click', () => {
      this.selectedDate = todayISO;
      document.getElementById('dashDatePicker')._flatpickr?.setDate(todayISO, true);
      const label = document.getElementById('dashDateLabel');
      const btn = document.getElementById('dashGoToday');
      if (label) {
        label.textContent = '(Hoy)';
        label.style.display = 'inline-block';
      }
      if (btn) btn.style.display = 'none';
      this.reload();
    });

    this.initWebSocket();
    await this.reload();
  },

  async reload() {
    await Promise.all([
      this.loadWelcomeWidget(),
      this.loadKPIs(),
      this.loadWeekly(),
      this.loadStatusCard(),
      this.loadLeaderboard(),
      this.loadLiveFeed()
    ]);
  },

  async loadWelcomeWidget() {
    try {
      const user = Auth.user();
      const name = user ? (user.full_name || user.username) : 'Usuario';
      
      const hr = new Date().getHours();
      let greeting = '¡Hola';
      if (hr >= 6 && hr < 12) {
        greeting = '¡Buenos días';
      } else if (hr >= 12 && hr < 18.5) {
        greeting = '¡Buenas tardes';
      } else {
        greeting = '¡Buenas noches';
      }
      
      const titleEl = document.getElementById('welcomeGreeting');
      if (titleEl) {
        titleEl.textContent = `${greeting}, ${name}!`;
      }
      
      const status = await API.get('/api/device/status');
      const indicator = document.getElementById('biometricIndicator');
      const info = document.getElementById('biometricInfo');
      
      if (indicator && info) {
        if (status.is_online) {
          indicator.className = 'biometric-indicator online';
          info.innerHTML = `ONLINE`;
        } else {
          indicator.className = 'biometric-indicator offline';
          info.innerHTML = `MOCK MODE`;
        }
      }
    } catch (e) {
      console.error('Error cargando widget de bienvenida:', e);
      const indicator = document.getElementById('biometricIndicator');
      const info = document.getElementById('biometricInfo');
      if (indicator && info) {
        indicator.className = 'biometric-indicator offline';
        info.innerHTML = `DESCONECTADO`;
      }
    }
  },

  async loadLeaderboard() {
    try {
      const data = await API.get('/api/reports/analytics/details?type=punctuality');
      const body = document.getElementById('leaderboardBody');
      if (!body) return;
      
      if (!data || data.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-3); font-size:0.86rem;">No hay suficientes datos para el podio.</div>`;
        return;
      }
      
      const sorted = [...data].sort((a, b) => {
        const rateA = parseFloat(a.rate.replace('%', ''));
        const rateB = parseFloat(b.rate.replace('%', ''));
        return rateB - rateA;
      });
      
      const top3 = sorted.slice(0, 3);
      const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
      
      body.innerHTML = top3.map((emp, idx) => {
        const rank = idx + 1;
        const medalClass = `leaderboard-rank-${rank}`;
        
        return `
          <div class="leaderboard-row">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="leaderboard-rank-badge ${medalClass}">${medals[rank]}</div>
              <div>
                <div style="font-weight:700; font-size:0.86rem; color:var(--text-1);">${emp.full_name}</div>
                <div style="font-size:0.74rem; color:var(--text-3);">${emp.department} • ${emp.employee_code}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:0.9rem; color:var(--accent);">${emp.rate}</div>
              <div style="font-size:0.72rem; color:var(--text-3);">${emp.ontime_entries}/${emp.total_entries} a tiempo</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Error cargando leaderboard:', e);
      const body = document.getElementById('leaderboardBody');
      if (body) {
        body.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger); font-size:0.86rem;">Error al cargar el podio.</div>`;
      }
    }
  },

  dateParam() {
    return this.selectedDate ? `?date=${this.selectedDate}` : '';
  },

  async loadKPIs() {
    try {
      const d = await API.get(`/api/dashboard/kpis${this.dateParam()}`);
      const icons = {
        emp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        present: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        absent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        late: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        leaves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="20"></line></svg>`
      };

      document.getElementById('kpiGrid').innerHTML = `
        ${this.kpiCard(icons.emp,'Total empleados', d.total_employees, 'registrados activos','--accent','total','bento-col-2')}
        ${this.kpiCard(icons.present,'Presentes', d.today_present, `${d.attendance_rate}% asistencia`,'--accent-3','present','bento-col-2')}
        ${this.kpiCard(icons.absent,'Ausentes', d.today_absent, 'sin registro de entrada','--danger','absent','bento-col-2')}
        ${this.kpiCard(icons.late,'Tardanzas', d.today_late, 'llegaron después de la hora','--warning','late','bento-col-3')}
        ${this.kpiCard(icons.leaves,'Vacaciones / Permiso', d.today_leaves, 'inasistencias justificadas','--accent-2','leaves','bento-col-3')}`;
    } catch(e) { Toast.show('Error cargando KPIs', 'error'); }
  },

  kpiCard(icon, label, value, sub, color, type, bentoClass) {
    return `<div class="double-bezel-outer ${bentoClass}">
      <div class="double-bezel-inner kpi-card" style="--accent-color:var(${color}); cursor:pointer; height:100%" onclick="DashboardPage.showKPIDetails('${type}')">
        <div class="kpi-icon">${icon}</div>
        <div class="kpi-value">${value ?? '-'}</div>
        <div class="kpi-label">${label}</div>
        <div class="kpi-sub">${sub}</div>
      </div>
    </div>`;
  },

  async showKPIDetails(type) {
    const titles = {
      total: 'Personal Registrado Activo',
      present: 'Colaboradores Presentes',
      absent: 'Colaboradores Ausentes',
      late: 'Retrasos / Tardanzas',
      leaves: 'Colaboradores con Vacaciones / Permiso'
    };

    Toast.show('Cargando detalles...', 'info');

    try {
      const dateQ = this.selectedDate ? `&date=${this.selectedDate}` : '';
      const data = await API.get(`/api/dashboard/kpis/details?type=${type}${dateQ}`);
      
      let html = '';
      if (!data || data.length === 0) {
        html = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-3);">
            <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
            <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No se encontraron registros para mostrar.</p>
          </div>
        `;
      } else {
        html = `
          <div style="max-height: 450px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
            <table style="width: 100%; min-width: auto; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="background: var(--surface-2); border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-1); position: sticky; top: 0; z-index: 10;">
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Cargo</th>
                  ${type === 'present' ? '<th style="padding: 12px 16px;">Hora Entrada</th>' : ''}
                  ${type === 'late' ? '<th style="padding: 12px 16px;">Hora Entrada</th><th style="padding: 12px 16px;">Retraso</th>' : ''}
                  ${type === 'leaves' ? '<th style="padding: 12px 16px;">Tipo Permiso</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${emp.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${emp.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${emp.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${emp.position}</td>
                    ${type === 'present' ? `<td style="padding: 12px 16px; font-weight: 600; color: var(--success);">${emp.check_in}</td>` : ''}
                    ${type === 'late' ? `<td style="padding: 12px 16px; color: var(--text-1);">${emp.check_in}</td><td style="padding: 12px 16px; font-weight: 600; color: var(--warning);">${emp.delay}</td>` : ''}
                    ${type === 'leaves' ? `<td style="padding: 12px 16px;"><span class="badge badge-blue">${emp.leave_type}</span></td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      Modal.open(titles[type], html, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
      
      const modalEl = document.querySelector('#modalOverlay .modal');
      if (modalEl) {
        modalEl.style.maxWidth = '780px';
      }
    } catch(err) {
      Toast.show('Error al cargar los detalles: ' + err.message, 'error');
    }
  },

  async loadStatusCard() {
    try {
      const d = await API.get(`/api/dashboard/kpis${this.dateParam()}`);
      const body = document.getElementById('statusBody');
      const dateEl = document.getElementById('statusDate');
      if (!body) return;

      // Mostrar la fecha del target, no necesariamente hoy
      const targetDate = d.target_date ? new Date(d.target_date + 'T12:00:00') : new Date();
      const formatted = targetDate.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (dateEl) dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);

      const total = d.total_employees || 1;
      const rows = [
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
          label: 'Presentes', value: d.today_present, color: 'var(--success)', bg: 'rgba(0,230,118,.12)', type: 'present'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
          label: 'Ausentes', value: d.today_absent, color: 'var(--danger)', bg: 'rgba(255,61,0,.12)', type: 'absent'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          label: 'Tardanzas', value: d.today_late, color: 'var(--warning)', bg: 'rgba(255,179,0,.12)', type: 'late'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="20"></line></svg>`,
          label: 'Vacaciones / Permiso', value: d.today_leaves, color: 'var(--accent-2)', bg: 'rgba(100,108,255,.12)', type: 'leaves'
        },
      ];

      body.innerHTML = rows.map(r => {
        const pct = Math.round(((r.value || 0) / total) * 100);
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="DashboardPage.showKPIDetails('${r.type}')" title="Ver detalles de ${r.label}">
            <div style="width:42px;height:42px;border-radius:50%;background:${r.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${r.color}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${r.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${r.icon.replace(/<svg[^>]*>|<\/svg>/g,'')}</svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                <span style="font-size:.83rem;color:var(--text-2);font-weight:500">${r.label}</span>
                <span style="font-size:1.1rem;font-weight:700;color:var(--text-1)">${r.value ?? '-'}</span>
              </div>
              <div style="height:5px;background:var(--surface-3);border-radius:10px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${r.color};border-radius:10px;transition:width .8s cubic-bezier(.4,0,.2,1)"></div>
              </div>
            </div>
          </div>`;
      }).join('');
    } catch(e) { console.warn(e); }
  },

  async loadWeekly() {
    try {
      const d = await API.get('/api/dashboard/weekly');
      const canvas = document.getElementById('weeklyChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      // Colores dinámicos usando CSS vars
      const style = getComputedStyle(document.documentElement);
      const accentRgb = style.getPropertyValue('--accent-rgb').trim() || '79, 70, 229';
      
      const gradPresent = ctx.createLinearGradient(0, 0, 0, 200);
      gradPresent.addColorStop(0, 'rgba(0, 230, 118, 0.8)');
      gradPresent.addColorStop(1, 'rgba(0, 230, 118, 0.1)');
      
      const gradAbsent = ctx.createLinearGradient(0, 0, 0, 200);
      gradAbsent.addColorStop(0, 'rgba(255, 61, 0, 0.7)');
      gradAbsent.addColorStop(1, 'rgba(255, 61, 0, 0.08)');
      
      const gradLate = ctx.createLinearGradient(0, 0, 0, 200);
      gradLate.addColorStop(0, 'rgba(255, 179, 0, 0.8)');
      gradLate.addColorStop(1, 'rgba(255, 179, 0, 0.1)');

      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: d.labels,
          datasets: [
            { label: 'Presentes', data: d.present, backgroundColor: gradPresent, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)' },
            { label: 'Ausentes',  data: d.absent,  backgroundColor: gradAbsent,  borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 61, 0, 0.3)' },
            { label: 'Tardanzas', data: d.late,    backgroundColor: gradLate,    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 179, 0, 0.3)' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { 
            legend: { 
              labels: { color: 'var(--text-3)', font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 } } 
            } 
          },
          scales: {
            x: { 
              ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10, weight: 500 } }, 
              grid: { color: 'rgba(0,0,0,.03)' } 
            },
            y: { 
              ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10, weight: 500 } }, 
              grid: { color: 'rgba(0,0,0,.03)' } 
            },
          },
        },
      });
    } catch(e) { console.warn(e); }
  },

  timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return new Date(iso).toLocaleDateString('es');
  },

  async loadLiveFeed() {
    try {
      const data = await API.get('/api/dashboard/recent-events?limit=5');
      const body = document.getElementById('liveFeedBody');
      if (!body) return;
      
      if (!data || data.length === 0) {
        body.innerHTML = `
          <div class="live-feed-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-3); text-align: center; gap: 8px; margin-top: 20px;">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="2" fill="none" style="opacity: 0.6;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span style="font-size: 0.8rem; font-weight: 600;">No hay actividad hoy</span>
          </div>
        `;
        return;
      }
      
      body.innerHTML = '';
      data.forEach(rec => {
        const photo = rec.photo_path ? `/${rec.photo_path}` : null;
        const initial = rec.employee_name.charAt(0).toUpperCase();
        const statusColor = rec.is_late ? 'var(--warning)' : 'var(--success)';
        const statusText = rec.is_late ? 'Tarde' : 'A Tiempo';
        const bgStatus = rec.is_late ? 'rgba(255,179,0,0.1)' : 'rgba(0,230,118,0.1)';
        const rawTime = new Date(rec.event_time);
        const timeStr = rawTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        
        const row = document.createElement('div');
        row.id = `live-rec-${rec.employee_code}-${timeStr}`;
        row.className = 'live-feed-row';
        row.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-2); padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); width: 100%;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; border: 2px solid ${statusColor};">
                ${photo ? `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 1rem; color: var(--text-2);">${initial}</span>`}
              </div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.employee_name}</div>
                <div style="font-size: 0.72rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.department || 'N/A'} • ${rec.employee_code}</div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: var(--text-1);">${timeStr}</span>
              <span style="font-size: 0.65rem; font-weight: 700; color: ${statusColor}; background: ${bgStatus}; padding: 2px 8px; border-radius: 20px;">${statusText}</span>
            </div>
          </div>
        `;
        body.appendChild(row);
      });
    } catch (e) {
      console.error('Error cargando live activity feed:', e);
    }
  },

  addLiveFeedRecord(rec) {
    const body = document.getElementById('liveFeedBody');
    if (!body) return;
    
    // Remove empty state if present
    const emptyState = body.querySelector('.live-feed-empty');
    if (emptyState || body.innerText.includes('Esperando marcas') || body.innerText.includes('No hay actividad')) {
      body.innerHTML = '';
    }
    
    // Check if we already have this record to prevent duplicates
    const existing = document.getElementById(`live-rec-${rec.employee_code}-${rec.timestamp}`);
    if (existing) return;
    
    // Create new element
    const el = document.createElement('div');
    el.id = `live-rec-${rec.employee_code}-${rec.timestamp}`;
    el.className = 'live-feed-row';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    el.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    const photo = rec.photo_path ? `/${rec.photo_path}` : null;
    const initial = rec.full_name.charAt(0).toUpperCase();
    const statusColor = rec.is_late ? 'var(--warning)' : 'var(--success)';
    const statusText = rec.is_late ? 'Tarde' : 'A Tiempo';
    const bgStatus = rec.is_late ? 'rgba(255,179,0,0.1)' : 'rgba(0,230,118,0.1)';
    
    el.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-2); padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); width: 100%;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; border: 2px solid ${statusColor};">
            ${photo ? `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 1rem; color: var(--text-2);">${initial}</span>`}
          </div>
          <div style="min-width: 0;">
            <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.full_name}</div>
            <div style="font-size: 0.72rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rec.department} • ${rec.employee_code}</div>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: var(--text-1);">${rec.timestamp}</span>
          <span style="font-size: 0.65rem; font-weight: 700; color: ${statusColor}; background: ${bgStatus}; padding: 2px 8px; border-radius: 20px;">${statusText}</span>
        </div>
      </div>
    `;
    
    // Prepend to body
    body.insertBefore(el, body.firstChild);
    
    // Trigger animation
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50);
    
    // Limit to last 5 items
    const items = body.querySelectorAll('.live-feed-row');
    if (items.length > 5) {
      const last = items[items.length - 1];
      last.style.opacity = '0';
      last.style.transform = 'translateY(10px)';
      setTimeout(() => last.remove(), 400);
    }
  },

  initWebSocket() {
    if (this.ws) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_ATTENDANCE') {
          const todayISO = new Date().toISOString().slice(0, 10);
          if (this.selectedDate === todayISO) {
             Toast.show(`⚡ ¡Nuevos registros sincronizados!`, 'info');
             this.reload();
          }
        } else if (data.type === 'NEW_ATTENDANCE_RECORD') {
          const todayISO = new Date().toISOString().slice(0, 10);
          if (this.selectedDate === todayISO) {
             this.addLiveFeedRecord(data);
          }
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };
    
    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.initWebSocket(), 5000);
    };
  }
};
