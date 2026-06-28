/* dashboard.js — Dashboard page */

const DashboardPage = {
  chart: null,
  selectedDate: null,

  async render() {
    const todayISO = new Date().toISOString().slice(0, 10);
    this.selectedDate = todayISO;

    document.getElementById('pageContent').innerHTML = `
      <div class="dash-page">

        <header class="dash-hero">
          <div class="dash-hero__greeting">
            <div class="dash-hero__eyebrow">Resumen del día</div>
            <h2 id="welcomeGreeting">¡Hola!</h2>
            <p id="welcomeSub">Que tengas una excelente jornada laboral hoy.</p>
          </div>
          <div class="dash-hero__toolbar">
            <div class="dash-hero__date-group">
              <div class="dash-date-selector" onclick="document.getElementById('dashDatePicker')._flatpickr?.open()">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Viendo datos de</span>
                <input id="dashDatePicker" class="dash-date-input" placeholder="Seleccionar fecha…" readonly />
              </div>
              <span id="dashDateLabel" class="dash-date-label" style="display:none;"></span>
              <button id="dashGoToday" class="btn btn-secondary btn-sm" style="display:none;">← Volver a hoy</button>
            </div>
            <div class="biometric-badge" id="biometricStatusBadge">
              <div class="biometric-indicator offline" id="biometricIndicator"></div>
              <div class="biometric-details">
                <span class="biometric-details-title">Dispositivo biométrico</span>
                <span class="biometric-details-sub" id="biometricInfo">Cargando estado…</span>
              </div>
            </div>
          </div>
        </header>

        <div class="dash-kpi-grid" id="kpiGrid">
          ${[1,2,3,4,5].map(() => `
            <div class="dash-kpi-card kpi-card">
              <div class="skeleton sk-text w-50"></div>
              <div class="skeleton sk-kpi"></div>
            </div>`).join('')}
        </div>

        <section class="dash-section">
          <article class="dash-panel">
            <div class="dash-panel__head">
              <div>
                <div class="dash-panel__title">Asistencia semanal</div>
                <div class="dash-panel__sub">Últimos 7 días</div>
              </div>
            </div>
            <div class="chart-container"><canvas id="weeklyChart"></canvas></div>
          </article>

          <article class="dash-panel" id="statusCard">
            <div class="dash-panel__head">
              <div>
                <div class="dash-panel__title">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Estado del día
                </div>
                <div class="dash-panel__sub" id="statusDate">Cargando fecha…</div>
              </div>
            </div>
            <div class="dash-status-list" id="statusBody">
              ${[1,2,3,4].map(() => `
                <div class="dash-status-row">
                  <div class="skeleton sk-avatar" style="width:40px;height:40px;border-radius:50%"></div>
                  <div class="dash-status-body" style="flex:1">
                    <div class="skeleton sk-text w-50"></div>
                    <div class="skeleton sk-text w-75" style="margin-top:8px;height:4px"></div>
                  </div>
                </div>`).join('')}
            </div>
          </article>
        </section>

        <section class="dash-section">
          <article class="leaderboard-card" id="leaderboardCard">
            <div class="leaderboard-header">
              <div>
                <div class="dash-panel__title">Podio de puntualidad</div>
                <div class="dash-panel__sub">Top 3 del mes por asistencia a tiempo</div>
              </div>
            </div>
            <div id="leaderboardBody" style="display:flex;flex-direction:column;gap:8px;">
              ${[1,2,3].map(() => `<div class="skeleton" style="height:52px;border-radius:9px;"></div>`).join('')}
            </div>
          </article>

          <article class="dash-panel dash-live-panel">
            <div class="dash-panel__head">
              <div>
                <div class="dash-panel__title">
                  <span class="live-pulse"></span>
                  Actividad en vivo
                </div>
                <div class="dash-panel__sub">Marcas recientes del lector</div>
              </div>
              <span class="dash-panel__tag">Tiempo real</span>
            </div>
            <div class="dash-live-feed" id="liveFeedBody">
              <div class="dash-live-empty live-feed-empty">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Esperando marcas en vivo…</span>
              </div>
            </div>
          </article>
        </section>

      </div>`;

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
            label.textContent = isToday ? 'Hoy' : '';
            label.style.display = isToday ? 'inline-block' : 'none';
          }
          if (btn) btn.style.display = isToday ? 'none' : 'inline-flex';
          this.reload();
        }
      });
    }

    const initialLabel = document.getElementById('dashDateLabel');
    if (initialLabel) {
      initialLabel.textContent = 'Hoy';
      initialLabel.style.display = 'inline-block';
    }

    document.getElementById('dashGoToday')?.addEventListener('click', () => {
      this.selectedDate = todayISO;
      document.getElementById('dashDatePicker')._flatpickr?.setDate(todayISO, true);
      const label = document.getElementById('dashDateLabel');
      const btn = document.getElementById('dashGoToday');
      if (label) {
        label.textContent = 'Hoy';
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
      if (hr >= 6 && hr < 12) greeting = '¡Buenos días';
      else if (hr >= 12 && hr < 18.5) greeting = '¡Buenas tardes';
      else greeting = '¡Buenas noches';

      const titleEl = document.getElementById('welcomeGreeting');
      if (titleEl) titleEl.textContent = `${greeting}, ${name}!`;

      const status = await API.get('/api/device/status');
      const indicator = document.getElementById('biometricIndicator');
      const info = document.getElementById('biometricInfo');

      if (indicator && info) {
        if (status.is_online) {
          indicator.className = 'biometric-indicator online';
          info.textContent = 'En línea';
        } else {
          indicator.className = 'biometric-indicator offline';
          info.textContent = 'Modo simulado';
        }
      }
    } catch (e) {
      console.error('Error cargando widget de bienvenida:', e);
      const indicator = document.getElementById('biometricIndicator');
      const info = document.getElementById('biometricInfo');
      if (indicator && info) {
        indicator.className = 'biometric-indicator offline';
        info.textContent = 'Desconectado';
      }
    }
  },

  async loadLeaderboard() {
    try {
      const data = await API.get('/api/reports/analytics/details?type=punctuality');
      const body = document.getElementById('leaderboardBody');
      if (!body) return;

      if (!data || data.length === 0) {
        body.innerHTML = `<div class="leaderboard-empty">No hay suficientes datos para el podio.</div>`;
        return;
      }

      const sorted = [...data].sort((a, b) => {
        const rateA = parseFloat(a.rate.replace('%', ''));
        const rateB = parseFloat(b.rate.replace('%', ''));
        return rateB - rateA;
      });

      const top3 = sorted.slice(0, 3);
      body.innerHTML = top3.map((emp, idx) => {
        const rank = idx + 1;
        return `
          <div class="leaderboard-row">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="leaderboard-rank-badge leaderboard-rank-${rank}">${rank}</div>
              <div>
                <div class="leaderboard-name">${emp.full_name}</div>
                <div class="leaderboard-meta">${emp.department} · ${emp.employee_code}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="leaderboard-rate">${emp.rate}</div>
              <div class="leaderboard-detail">${emp.ontime_entries}/${emp.total_entries} a tiempo</div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('Error cargando leaderboard:', e);
      const body = document.getElementById('leaderboardBody');
      if (body) body.innerHTML = `<div class="leaderboard-empty" style="color:var(--danger)">No se pudo cargar el podio.</div>`;
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
        ${this.kpiCard(icons.emp, 'Total empleados', d.total_employees, 'registrados activos', '--accent', 'total')}
        ${this.kpiCard(icons.present, 'Presentes', d.today_present, `${d.attendance_rate}% asistencia`, '--success', 'present')}
        ${this.kpiCard(icons.absent, 'Ausentes', d.today_absent, 'sin registro de entrada', '--danger', 'absent')}
        ${this.kpiCard(icons.late, 'Tardanzas', d.today_late, 'llegaron después de la hora', '--warning', 'late')}
        ${this.kpiCard(icons.leaves, 'Vacaciones / permiso', d.today_leaves, 'inasistencias justificadas', '--accent-2', 'leaves')}`;
    } catch (e) { Toast.show('Error cargando KPIs', 'error'); }
  },

  kpiCard(icon, label, value, sub, color, type) {
    return `<div class="dash-kpi-card kpi-card" style="--accent-color:var(${color})" onclick="DashboardPage.showKPIDetails('${type}')">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-value">${value ?? '-'}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  },

  async showKPIDetails(type) {
    const titles = {
      total: 'Personal registrado activo',
      present: 'Colaboradores presentes',
      absent: 'Colaboradores ausentes',
      late: 'Retrasos y tardanzas',
      leaves: 'Vacaciones y permisos'
    };

    Toast.show('Cargando detalles…', 'info');

    try {
      const dateQ = this.selectedDate ? `&date=${this.selectedDate}` : '';
      const data = await API.get(`/api/dashboard/kpis/details?type=${type}${dateQ}`);

      let html = '';
      if (!data || data.length === 0) {
        html = `<div class="empty-state" style="padding:32px 16px"><p>No hay registros para mostrar.</p></div>`;
      } else {
        html = `
          <div class="table-wrap" style="max-height:450px;overflow-y:auto">
            <table style="min-width:auto">
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Departamento</th><th>Cargo</th>
                  ${type === 'present' ? '<th>Hora entrada</th>' : ''}
                  ${type === 'late' ? '<th>Hora entrada</th><th>Retraso</th>' : ''}
                  ${type === 'leaves' ? '<th>Tipo permiso</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => `
                  <tr>
                    <td><code>${emp.employee_code}</code></td>
                    <td style="font-weight:600">${emp.full_name}</td>
                    <td>${emp.department}</td>
                    <td>${emp.position}</td>
                    ${type === 'present' ? `<td style="font-weight:600;color:var(--success)">${emp.check_in}</td>` : ''}
                    ${type === 'late' ? `<td>${emp.check_in}</td><td style="font-weight:600;color:var(--warning)">${emp.delay}</td>` : ''}
                    ${type === 'leaves' ? `<td><span class="badge badge-blue">${emp.leave_type}</span></td>` : ''}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      }

      Modal.open(titles[type], html, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
      const modalEl = document.querySelector('#modalOverlay .modal');
      if (modalEl) modalEl.style.maxWidth = '780px';
    } catch (err) {
      Toast.show('Error al cargar los detalles: ' + err.message, 'error');
    }
  },

  statusIcon(svgInner, color, bg) {
    return `<div class="dash-status-icon" style="background:${bg};color:${color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg></div>`;
  },

  async loadStatusCard() {
    try {
      const d = await API.get(`/api/dashboard/kpis${this.dateParam()}`);
      const body = document.getElementById('statusBody');
      const dateEl = document.getElementById('statusDate');
      if (!body) return;

      const targetDate = d.target_date ? new Date(d.target_date + 'T12:00:00') : new Date();
      const formatted = targetDate.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (dateEl) dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);

      const total = d.total_employees || 1;
      const rows = [
        { icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>', label: 'Presentes', value: d.today_present, color: 'var(--success)', bg: 'rgba(5,150,105,0.1)', type: 'present' },
        { icon: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>', label: 'Ausentes', value: d.today_absent, color: 'var(--danger)', bg: 'rgba(220,38,38,0.08)', type: 'absent' },
        { icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>', label: 'Tardanzas', value: d.today_late, color: 'var(--warning)', bg: 'rgba(217,119,6,0.1)', type: 'late' },
        { icon: '<rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="20"></line>', label: 'Vacaciones / permiso', value: d.today_leaves, color: 'var(--accent)', bg: 'rgba(var(--accent-rgb),0.08)', type: 'leaves' },
      ];

      body.innerHTML = rows.map(r => {
        const pct = Math.round(((r.value || 0) / total) * 100);
        return `
          <div class="dash-status-row" onclick="DashboardPage.showKPIDetails('${r.type}')" title="Ver detalles de ${r.label}">
            ${this.statusIcon(r.icon, r.color, r.bg)}
            <div class="dash-status-body">
              <div class="dash-status-meta">
                <span class="dash-status-label">${r.label}</span>
                <span class="dash-status-value">${r.value ?? '-'}</span>
              </div>
              <div class="dash-status-bar">
                <div class="dash-status-bar__fill" style="width:${pct}%;background:${r.color}"></div>
              </div>
            </div>
          </div>`;
      }).join('');
    } catch (e) { console.warn(e); }
  },

  async loadWeekly() {
    try {
      const d = await API.get('/api/dashboard/weekly');
      const canvas = document.getElementById('weeklyChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const gradPresent = ctx.createLinearGradient(0, 0, 0, 200);
      gradPresent.addColorStop(0, 'rgba(5, 150, 105, 0.75)');
      gradPresent.addColorStop(1, 'rgba(5, 150, 105, 0.08)');

      const gradAbsent = ctx.createLinearGradient(0, 0, 0, 200);
      gradAbsent.addColorStop(0, 'rgba(220, 38, 38, 0.65)');
      gradAbsent.addColorStop(1, 'rgba(220, 38, 38, 0.06)');

      const gradLate = ctx.createLinearGradient(0, 0, 0, 200);
      gradLate.addColorStop(0, 'rgba(217, 119, 6, 0.75)');
      gradLate.addColorStop(1, 'rgba(217, 119, 6, 0.08)');

      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: d.labels,
          datasets: [
            { label: 'Presentes', data: d.present, backgroundColor: gradPresent, borderRadius: 5, borderWidth: 0 },
            { label: 'Ausentes', data: d.absent, backgroundColor: gradAbsent, borderRadius: 5, borderWidth: 0 },
            { label: 'Tardanzas', data: d.late, backgroundColor: gradLate, borderRadius: 5, borderWidth: 0 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' }, boxWidth: 10, padding: 16 }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 }, precision: 0 },
              grid: { color: 'rgba(15, 23, 42, 0.04)' },
              border: { display: false }
            },
          },
        },
      });
    } catch (e) { console.warn(e); }
  },

  liveRowHtml(rec, timeStr) {
    const photo = rec.photo_path ? `/${rec.photo_path}` : null;
    const name = rec.employee_name || rec.full_name;
    const initial = name.charAt(0).toUpperCase();
    const isLate = rec.is_late;
    const statusColor = isLate ? 'var(--warning)' : 'var(--success)';
    const statusText = isLate ? 'Tarde' : 'A tiempo';
    const bgStatus = isLate ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.1)';
    const borderColor = isLate ? 'var(--warning)' : 'var(--success)';

    return `
      <div class="dash-live-row live-feed-row">
        <div class="dash-live-row__person">
          <div class="dash-live-avatar" style="border:2px solid ${borderColor}">
            ${photo ? `<img src="${photo}" alt="" />` : initial}
          </div>
          <div>
            <div class="dash-live-name">${name}</div>
            <div class="dash-live-meta">${rec.department || 'N/A'} · ${rec.employee_code}</div>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <span class="dash-live-time">${timeStr}</span>
          <span class="dash-live-badge" style="color:${statusColor};background:${bgStatus}">${statusText}</span>
        </div>
      </div>`;
  },

  async loadLiveFeed() {
    try {
      const data = await API.get('/api/dashboard/recent-events?limit=5');
      const body = document.getElementById('liveFeedBody');
      if (!body) return;

      if (!data || data.length === 0) {
        body.innerHTML = `
          <div class="dash-live-empty live-feed-empty">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>No hay actividad hoy</span>
          </div>`;
        return;
      }

      body.innerHTML = data.map(rec => {
        const rawTime = new Date(rec.event_time);
        const timeStr = rawTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        return this.liveRowHtml(rec, timeStr);
      }).join('');
    } catch (e) {
      console.error('Error cargando live activity feed:', e);
    }
  },

  addLiveFeedRecord(rec) {
    const body = document.getElementById('liveFeedBody');
    if (!body) return;

    if (body.querySelector('.live-feed-empty')) body.innerHTML = '';

    const rowId = `live-rec-${rec.employee_code}-${rec.timestamp}`;
    if (document.getElementById(rowId)) return;

    const temp = document.createElement('div');
    temp.innerHTML = this.liveRowHtml(rec, rec.timestamp).trim();
    const row = temp.firstElementChild;
    row.id = rowId;
    row.style.opacity = '0';
    row.style.transform = 'translateY(-8px)';
    row.style.transition = 'opacity 0.35s ease, transform 0.35s ease';

    body.insertBefore(row, body.firstChild);

    requestAnimationFrame(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    });

    const items = body.querySelectorAll('.live-feed-row');
    if (items.length > 5) {
      const last = items[items.length - 1];
      last.style.opacity = '0';
      setTimeout(() => last.remove(), 300);
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
            Toast.show('Nuevos registros sincronizados', 'info');
            this.reload();
          }
        } else if (data.type === 'NEW_ATTENDANCE_RECORD') {
          const todayISO = new Date().toISOString().slice(0, 10);
          if (this.selectedDate === todayISO) this.addLiveFeedRecord(data);
        }
      } catch (e) {
        console.error('WS error:', e);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.initWebSocket(), 5000);
    };
  }
};
