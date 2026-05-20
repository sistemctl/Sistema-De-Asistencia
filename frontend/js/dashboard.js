/* dashboard.js — Dashboard page */

const DashboardPage = {
  chart: null,

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div><div class="section-title">Dashboard</div><div style="color:var(--text-3);font-size:.8rem;margin-top:2px">Resumen de asistencia en tiempo real</div></div>
      </div>

      <!-- KPIs -->
      <div class="grid-5" id="kpiGrid" style="margin-bottom:24px">
        ${[1,2,3,4,5].map(() => `<div class="kpi-card"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-kpi"></div></div>`).join('')}
      </div>

      <!-- Charts + Recent -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Asistencia semanal</div><div class="card-sub">Últimos 7 días</div></div></div>
          <div class="chart-container"><canvas id="weeklyChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Últimas entradas</div></div>
          <div class="event-list" id="recentList">
            ${[1,2,3,4].map(() => `
              <div class="event-item">
                <div class="skeleton sk-avatar"></div>
                <div style="flex:1"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-text w-75"></div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    await Promise.all([this.loadKPIs(), this.loadWeekly(), this.loadRecent()]);
  },

  async loadKPIs() {
    try {
      const d = await API.get('/api/dashboard/kpis');
      const icons = {
        emp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        present: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        absent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        late: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        leaves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="20"></line></svg>`
      };

      document.getElementById('kpiGrid').innerHTML = `
        ${this.kpiCard(icons.emp,'Total empleados', d.total_employees, 'registrados activos','--accent')}
        ${this.kpiCard(icons.present,'Presentes hoy', d.today_present, `${d.attendance_rate}% asistencia`,'--accent-3')}
        ${this.kpiCard(icons.absent,'Ausentes hoy', d.today_absent, 'sin registro de entrada','--danger')}
        ${this.kpiCard(icons.late,'Tardanzas', d.today_late, 'llegaron después de la hora','--warning')}
        ${this.kpiCard(icons.leaves,'De Vacaciones / Permiso', d.today_leaves, 'inasistencias justificadas','--accent-2')}`;
    } catch(e) { Toast.show('Error cargando KPIs', 'error'); }
  },

  kpiCard(icon, label, value, sub, color) {
    return `<div class="kpi-card" style="--accent-color:var(${color})">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-value">${value ?? '-'}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  },

  async loadWeekly() {
    try {
      const d = await API.get('/api/dashboard/weekly');
      const canvas = document.getElementById('weeklyChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      // Crear gradientes premium
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
              labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 } } 
            } 
          },
          scales: {
            x: { 
              ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10, weight: 500 } }, 
              grid: { color: 'rgba(255,255,255,.03)' } 
            },
            y: { 
              ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 10, weight: 500 } }, 
              grid: { color: 'rgba(255,255,255,.03)' } 
            },
          },
        },
      });
    } catch(e) {}
  },

  async loadRecent() {
    try {
      const items = await API.get('/api/dashboard/recent-events');
      const list = document.getElementById('recentList');
      if (!list) return;
      if (!items?.length) { 
        list.innerHTML = `<div class="empty-state"><div class="icon">✨</div><h3>¡Día tranquilo!</h3><p>Aún no hay movimientos registrados hoy.</p></div>`; 
        return; 
      }
      list.innerHTML = items.map(e => `
        <div class="event-item">
          <div class="emp-avatar">${e.employee_name.charAt(0)}</div>
          <div style="flex:1">
            <div class="event-name">${e.employee_name}</div>
            <div class="event-sub">${e.event_type === 'entry' ? '<span style="color:var(--success)">🟢 Entrada</span>' : '<span style="color:var(--danger)">🔴 Salida</span>'}${e.is_late ? ' · <span style="color:var(--warning);font-weight:600;">Tardanza</span>' : ''}</div>
          </div>
          <div class="event-time">${this.timeAgo(e.event_time)}</div>
        </div>`).join('');
    } catch(e) {}
  },

  timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return new Date(iso).toLocaleDateString('es');
  },
};
