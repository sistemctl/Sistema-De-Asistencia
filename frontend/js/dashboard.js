/* dashboard.js — Dashboard page */

const DashboardPage = {
  chart: null,
  selectedDate: null, // null = hoy

  async render() {
    // Fecha inicial: hoy
    const todayISO = new Date().toISOString().slice(0, 10);
    this.selectedDate = todayISO;

    document.getElementById('pageContent').innerHTML = `
      <!-- Barra de fecha -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span style="font-size:.85rem;font-weight:600;color:var(--text-2);">Viendo datos de:</span>
          <input id="dashDatePicker" class="flatpickr-input" placeholder="Seleccionar fecha…"
            style="padding:7px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;color:var(--text-1);font-size:.85rem;font-weight:600;font-family:inherit;cursor:pointer;width:180px;outline:none;" readonly />
          <span id="dashDateLabel" style="font-size:.78rem;color:var(--text-3);font-weight:500;"></span>
        </div>
        <button id="dashGoToday" class="btn btn-secondary btn-sm" style="display:none;">
          ← Volver a hoy
        </button>
      </div>

      <!-- KPIs -->
      <div class="grid-5" id="kpiGrid" style="margin-bottom:24px">
        ${[1,2,3,4,5].map(() => `<div class="kpi-card"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-kpi"></div></div>`).join('')}
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
          if (label) label.textContent = isToday ? '(Hoy)' : '';
          if (btn) btn.style.display = isToday ? 'none' : 'inline-flex';
          this.reload();
        }
      });
    }

    // Botón "Volver a hoy"
    document.getElementById('dashGoToday')?.addEventListener('click', () => {
      this.selectedDate = todayISO;
      document.getElementById('dashDatePicker')._flatpickr?.setDate(todayISO, true);
      const label = document.getElementById('dashDateLabel');
      const btn = document.getElementById('dashGoToday');
      if (label) label.textContent = '(Hoy)';
      if (btn) btn.style.display = 'none';
      this.reload();
    });

    await this.reload();
  },

  async reload() {
    await Promise.all([
      this.loadKPIs(),
      this.loadWeekly(),
      this.loadStatusCard()
    ]);
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
        ${this.kpiCard(icons.emp,'Total empleados', d.total_employees, 'registrados activos','--accent','total')}
        ${this.kpiCard(icons.present,'Presentes', d.today_present, `${d.attendance_rate}% asistencia`,'--accent-3','present')}
        ${this.kpiCard(icons.absent,'Ausentes', d.today_absent, 'sin registro de entrada','--danger','absent')}
        ${this.kpiCard(icons.late,'Tardanzas', d.today_late, 'llegaron después de la hora','--warning','late')}
        ${this.kpiCard(icons.leaves,'Vacaciones / Permiso', d.today_leaves, 'inasistencias justificadas','--accent-2','leaves')}`;
    } catch(e) { Toast.show('Error cargando KPIs', 'error'); }
  },

  kpiCard(icon, label, value, sub, color, type) {
    return `<div class="kpi-card" style="--accent-color:var(${color}); cursor:pointer" onclick="DashboardPage.showKPIDetails('${type}')">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-value">${value ?? '-'}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-sub">${sub}</div>
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
          label: 'Presentes', value: d.today_present, color: 'var(--success)', bg: 'rgba(0,230,118,.12)'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
          label: 'Ausentes', value: d.today_absent, color: 'var(--danger)', bg: 'rgba(255,61,0,.12)'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
          label: 'Tardanzas', value: d.today_late, color: 'var(--warning)', bg: 'rgba(255,179,0,.12)'
        },
        {
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="20"></line></svg>`,
          label: 'Vacaciones / Permiso', value: d.today_leaves, color: 'var(--accent-2)', bg: 'rgba(100,108,255,.12)'
        },
      ];

      body.innerHTML = rows.map(r => {
        const pct = Math.round(((r.value || 0) / total) * 100);
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border)">
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
    } catch(e) {}
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
