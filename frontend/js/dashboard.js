/* dashboard.js — Dashboard page */

const DashboardPage = {
  chart: null,

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div><div class="section-title">Dashboard</div><div style="color:var(--text-3);font-size:.8rem;margin-top:2px">Resumen de asistencia en tiempo real</div></div>
      </div>

      <!-- KPIs -->
      <div class="grid-4" id="kpiGrid" style="margin-bottom:20px">
        ${[1,2,3,4].map(() => `<div class="kpi-card"><div class="spinner" style="margin:16px auto"></div></div>`).join('')}
      </div>

      <!-- Charts + Recent -->
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Asistencia semanal</div><div class="card-sub">Últimos 7 días</div></div></div>
          <div class="chart-container"><canvas id="weeklyChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Últimas entradas</div></div>
          <div class="event-list" id="recentList"><div class="loading-overlay"><div class="spinner"></div></div></div>
        </div>
      </div>`;

    await Promise.all([this.loadKPIs(), this.loadWeekly(), this.loadRecent()]);
  },

  async loadKPIs() {
    try {
      const d = await API.get('/api/dashboard/kpis');
      document.getElementById('kpiGrid').innerHTML = `
        ${this.kpiCard('👥','Total empleados', d.total_employees, 'registrados activos','--accent')}
        ${this.kpiCard('✅','Presentes hoy', d.today_present, `${d.attendance_rate}% asistencia`,'--accent-3')}
        ${this.kpiCard('❌','Ausentes hoy', d.today_absent, 'sin registro de entrada','--danger')}
        ${this.kpiCard('⏰','Tardanzas', d.today_late, 'llegaron después de la hora','--warning')}`;
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
      const ctx = document.getElementById('weeklyChart');
      if (!ctx) return;
      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: d.labels,
          datasets: [
            { label: 'Presentes', data: d.present, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 6 },
            { label: 'Ausentes',  data: d.absent,  backgroundColor: 'rgba(239,68,68,.4)',  borderRadius: 6 },
            { label: 'Tardanzas', data: d.late,    backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 6 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
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
      if (!items?.length) { list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Sin eventos recientes</p></div>`; return; }
      list.innerHTML = items.map(e => `
        <div class="event-item">
          <div class="emp-avatar">${e.employee_name.charAt(0)}</div>
          <div style="flex:1">
            <div class="event-name">${e.employee_name}</div>
            <div class="event-sub">${e.event_type === 'entry' ? '🟢 Entrada' : '🔴 Salida'}${e.is_late ? ' · <span style="color:var(--warning)">Tardanza</span>' : ''}</div>
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
