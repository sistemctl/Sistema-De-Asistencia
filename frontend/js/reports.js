/* reports.js — Exportación de reportes */

const ReportsPage = {
  doughnutChart: null,
  lineChart: null,

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header"><div class="section-title">Reportes</div></div>
      <div class="grid-3">

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--success)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Exportar Excel
              </div>
              <div class="card-sub">Formato .xlsx compatible con Excel</div>
            </div>
          </div>
          <div class="field"><label>Rango de Fechas</label><input type="text" id="xlDateRange" placeholder="Selecciona el rango..." /></div>
          <div style="margin-top:12px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportExcel()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar Excel
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Exportar PDF
              </div>
              <div class="card-sub">Reporte en formato PDF imprimible</div>
            </div>
          </div>
          <div class="field"><label>Rango de Fechas</label><input type="text" id="pdfDateRange" placeholder="Selecciona el rango..." /></div>
          <div style="margin-top:12px">
            <button class="btn btn-primary" style="width:100%" onclick="ReportsPage.exportPDF()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar PDF
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--success)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Consolidado Diario
              </div>
              <div class="card-sub">Una sola fila por día (Entrada y Salida)</div>
            </div>
          </div>
          <div class="field"><label>Rango de Fechas</label><input type="text" id="consDateRange" placeholder="Selecciona el rango..." /></div>
          <div style="margin-top:12px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportConsolidated()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Consolidado Excel
            </button>
          </div>
        </div>

      </div>

      <!-- MÓDULO DE ANALÍTICA DE DATOS -->
      <div class="card" style="margin-top:24px">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Analítica de Asistencia y Rendimiento
            </div>
            <div class="card-sub">Estadísticas avanzadas, puntualidad y métricas del personal</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="analyticsSearch" style="width:200px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-1); border-radius:8px; padding:6px 12px; font-size:0.85rem;" placeholder="Buscar empleado..." />
            <input type="text" id="analyticsDateRange" style="width:240px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-1); border-radius:8px; padding:6px 12px; font-size:0.85rem;" placeholder="Filtrar fecha..." />
            <button class="btn btn-sm btn-primary" onclick="ReportsPage.loadAnalytics()">Filtrar</button>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="grid-4" style="margin-top: 20px; margin-bottom: 24px;">
          <div class="kpi-card" style="--accent-color:var(--accent-3); background:rgba(255,255,255,0.02)">
            <div class="kpi-value" id="anTasaAsistencia" style="font-size:1.8rem">-</div>
            <div class="kpi-label">Puntualidad General</div>
            <div class="kpi-sub">Entradas sin tardanza</div>
          </div>
          <div class="kpi-card" style="--accent-color:var(--warning); background:rgba(255,255,255,0.02)">
            <div class="kpi-value" id="anTotalTardanzas" style="font-size:1.8rem">-</div>
            <div class="kpi-label">Total Tardanzas</div>
            <div class="kpi-sub">Registros con llegada tarde</div>
          </div>
          <div class="kpi-card" style="--accent-color:var(--success); background:rgba(255,255,255,0.02)">
            <div class="kpi-value" id="anPromedioEntrada" style="font-size:1.8rem">-</div>
            <div class="kpi-label">Hora Promedio Entrada</div>
            <div class="kpi-sub">Frecuencia de marcación</div>
          </div>
          <div class="kpi-card" style="--accent-color:var(--accent-2); background:rgba(255,255,255,0.02)">
            <div class="kpi-value" id="anDiaCritico" style="font-size:1.8rem">-</div>
            <div class="kpi-label">Día Crítico</div>
            <div class="kpi-sub">Mayor incidencia de retrasos</div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid-2">
          <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); margin:0;">
            <div class="card-header"><div class="card-title" style="font-size:0.875rem">Distribución del Estado de Asistencia</div></div>
            <div class="chart-container" style="height:250px; position:relative;"><canvas id="anDoughnutChart"></canvas></div>
          </div>
          <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); margin:0;">
            <div class="card-header"><div class="card-title" style="font-size:0.875rem">Tendencia de Asistencia Diaria</div></div>
            <div class="chart-container" style="height:250px; position:relative;"><canvas id="anLineChart"></canvas></div>
          </div>
        </div>
      </div>

      <!-- DETAILED ATTENDANCE REPORT WITH GRANULARITY AND EMPLOYEE FILTERS -->
      <div class="card" style="margin-top:24px">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Visualizador de Reportes de Asistencia (Schedules)
            </div>
            <div class="card-sub">Reporte estructurado según jornada laboral (continua/partida) y granularidad</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <select id="repEmployee" style="width:180px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-1); border-radius:8px; padding:6px 12px; font-size:0.85rem;">
              <option value="">Todos los empleados</option>
            </select>
            <select id="repGranularity" style="width:120px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-1); border-radius:8px; padding:6px 12px; font-size:0.85rem;" onchange="ReportsPage.onGranularityChange()">
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
            <input type="text" id="repDateRange" style="width:220px; background:var(--surface-2); border:1px solid var(--border); color:var(--text-1); border-radius:8px; padding:6px 12px; font-size:0.85rem;" placeholder="Filtrar fecha..." />
            <button class="btn btn-sm btn-primary" onclick="ReportsPage.loadReportTable(1)">Buscar</button>
            <button class="btn btn-sm btn-success" onclick="ReportsPage.exportReport('excel')">Excel</button>
            <button class="btn btn-sm btn-primary" onclick="ReportsPage.exportReport('pdf')" style="background:var(--accent)">PDF</button>
          </div>
        </div>

        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead id="repTableHead">
              <tr>
                <th>Empleado</th>
                <th>Código</th>
                <th>Departamento</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Entrada</th>
                <th>Sal. Alm.</th>
                <th>Ret. Alm.</th>
                <th>Salida</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="repTableBody">
              <tr>
                <td colspan="10" style="text-align:center; color:var(--text-3);">Cargando reporte...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination" id="repPagination" style="margin-top:16px;"></div>
      </div>

      <div class="card" style="margin-top:24px">
        <div class="card-header">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Información
          </div>
        </div>
        <p style="color:var(--text-2);font-size:.875rem;line-height:1.7">
          Los reportes y exportaciones se calculan dinámicamente según el tipo de horario del empleado asignado (Jornada Continua: 1 entrada / 1 salida; Jornada Partida: 2 entradas / 2 salidas).<br>
          Para reportes Semanales y Mensuales, el estado muestra si se detectó alguna anomalía en el período correspondiente.<br>
          El archivo se descargará automáticamente al presionar los botones Excel o PDF.
        </p>
      </div>`;

    // Inicializar Flatpickr con localización en español y rango por defecto (últimos 30 días)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    ['xlDateRange', 'pdfDateRange', 'consDateRange', 'analyticsDateRange', 'repDateRange'].forEach(id => {
      flatpickr(`#${id}`, { 
        mode: "range", 
        locale: "es", 
        showMonths: id === 'analyticsDateRange' || id === 'repDateRange' ? 1 : 2,
        dateFormat: "Y-m-d", 
        altInput: true, 
        altFormat: "d M Y", 
        defaultDate: id === 'analyticsDateRange' || id === 'repDateRange' ? [thirtyDaysAgo, todayStr] : [firstDay, todayStr] 
      });
    });

    // Cargar selector de empleados
    try {
      const emps = await API.get('/api/employees');
      const repEmp = document.getElementById('repEmployee');
      if (repEmp && emps) {
        emps.forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id;
          opt.textContent = `${e.first_name} ${e.last_name} (${e.employee_code})`;
          repEmp.appendChild(opt);
        });
      }
    } catch (e) {
      console.error("Error loading employees for report selector", e);
    }

    await this.loadAnalytics();
    await this.loadReportTable(1);
  },

  async loadAnalytics() {
    try {
      const params = this.buildParams('analyticsDateRange', 'analyticsSearch');
      const data = await API.get(`/api/reports/analytics${params}`);

      document.getElementById('anTasaAsistencia').textContent = data.kpis.punctuality_rate;
      document.getElementById('anTotalTardanzas').textContent = data.kpis.total_lates;
      document.getElementById('anPromedioEntrada').textContent = data.kpis.avg_entry_time;
      document.getElementById('anDiaCritico').textContent = data.kpis.critical_day;

      // Doughnut Chart
      const dCanvas = document.getElementById('anDoughnutChart');
      if (dCanvas) {
        const dCtx = dCanvas.getContext('2d');
        if (this.doughnutChart) this.doughnutChart.destroy();
        this.doughnutChart = new Chart(dCtx, {
          type: 'doughnut',
          data: {
            labels: ['A tiempo', 'Tarde', 'Ausente', 'Licencia/Permiso'],
            datasets: [{
              data: [data.distribution.ontime, data.distribution.late, data.distribution.absent, data.distribution.leaves],
              backgroundColor: [
                'rgba(0, 230, 118, 0.85)',
                'rgba(255, 179, 0, 0.85)',
                'rgba(255, 61, 0, 0.85)',
                'rgba(170, 0, 255, 0.85)'
              ],
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#cbd5e1',
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 }
                }
              }
            },
            cutout: '70%'
          }
        });
      }

      // Line Chart
      const lCanvas = document.getElementById('anLineChart');
      if (lCanvas) {
        const lCtx = lCanvas.getContext('2d');
        if (this.lineChart) this.lineChart.destroy();

        const gradPresent = lCtx.createLinearGradient(0, 0, 0, 200);
        gradPresent.addColorStop(0, 'rgba(0, 230, 118, 0.25)');
        gradPresent.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

        const gradLate = lCtx.createLinearGradient(0, 0, 0, 200);
        gradLate.addColorStop(0, 'rgba(255, 179, 0, 0.25)');
        gradLate.addColorStop(1, 'rgba(255, 179, 0, 0.0)');

        this.lineChart = new Chart(lCtx, {
          type: 'line',
          data: {
            labels: data.trend.labels,
            datasets: [
              {
                label: 'A tiempo',
                data: data.trend.present,
                borderColor: 'rgba(0, 230, 118, 0.9)',
                backgroundColor: gradPresent,
                fill: true,
                tension: 0.3,
                borderWidth: 2
              },
              {
                label: 'Tardanzas',
                data: data.trend.late,
                borderColor: 'rgba(255, 179, 0, 0.9)',
                backgroundColor: gradLate,
                fill: true,
                tension: 0.3,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: '#cbd5e1',
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 }
                }
              }
            },
            scales: {
              x: { 
                ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9, weight: 500 } }, 
                grid: { color: 'rgba(255,255,255,.02)' } 
              },
              y: { 
                ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9, weight: 500 }, stepSize: 1 }, 
                grid: { color: 'rgba(255,255,255,.02)' } 
              }
            }
          }
        });
      }
    } catch(e) {
      console.error(e);
      Toast.show('Error cargando analítica de datos', 'error');
    }
  },

  download(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.click();
  },

  buildParams(rangeId, searchId = null) {
    const p = new URLSearchParams();
    const range = document.getElementById(rangeId).value;
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) p.set('date_from', dates[0]);
      if (dates.length > 1 && dates[1]) p.set('date_to', dates[1]);
      else if (dates.length === 1 && dates[0]) p.set('date_to', dates[0]);
    }
    if (searchId) {
      const searchInput = document.getElementById(searchId);
      if (searchInput && searchInput.value) {
        p.set('search', searchInput.value);
      }
    }
    return p.toString() ? `?${p}` : '';
  },

  exportExcel() {
    const token = API.token();
    const params = this.buildParams('xlDateRange');
    fetch(`/api/reports/excel${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `asistencia_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
        Toast.show('Excel descargado', 'success');
      })
      .catch(() => Toast.show('Error generando Excel', 'error'));
  },

  exportPDF() {
    const token = API.token();
    const params = this.buildParams('pdfDateRange');
    fetch(`/api/reports/pdf${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `asistencia_${new Date().toISOString().split('T')[0]}.pdf`; a.click();
        Toast.show('PDF descargado', 'success');
      })
      .catch(() => Toast.show('Error generando PDF', 'error'));
  },

  exportConsolidated() {
    const token = API.token();
    const params = this.buildParams('consDateRange');
    fetch(`/api/reports/consolidated${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `consolidado_asistencia_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
        Toast.show('Consolidado descargado', 'success');
      })
      .catch(() => Toast.show('Error generando Consolidado', 'error'));
  },

  reportPage: 1,

  async loadReportTable(page = 1) {
    this.reportPage = page;
    const repEmployee = document.getElementById('repEmployee').value;
    const repGranularity = document.getElementById('repGranularity').value;
    const range = document.getElementById('repDateRange').value;
    
    const params = new URLSearchParams({
      page: this.reportPage,
      page_size: 15,
      granularity: repGranularity
    });

    if (repEmployee) params.set('employee_id', repEmployee);
    
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) params.set('date_from', dates[0]);
      if (dates.length > 1 && dates[1]) params.set('date_to', dates[1]);
      else if (dates.length === 1 && dates[0]) params.set('date_to', dates[0]);
    }

    const tbody = document.getElementById('repTableBody');
    tbody.innerHTML = Array.from({length: 5}).map(() => `<tr>
      <td colspan="10"><div class="skeleton sk-text w-100" style="height:20px;"></div></td>
    </tr>`).join('');

    try {
      const data = await API.get(`/api/reports/report?${params}`);
      const thead = document.getElementById('repTableHead');
      
      if (repGranularity === 'daily') {
        thead.innerHTML = `
          <tr>
            <th>Empleado</th>
            <th>Código</th>
            <th>Departamento</th>
            <th>Fecha</th>
            <th>Horario</th>
            <th>Entrada</th>
            <th>Sal. Alm.</th>
            <th>Ret. Alm.</th>
            <th>Salida</th>
            <th>Estado</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th>Empleado</th>
            <th>Código</th>
            <th>Departamento</th>
            <th>Período</th>
            <th>Horario</th>
            <th>Presente</th>
            <th>Tardanzas</th>
            <th>Incompletos</th>
            <th>Eventos Totales</th>
          </tr>
        `;
      }

      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><h3>Sin registros</h3><p>No se encontraron datos para los filtros especificados.</p></div></td></tr>`;
        document.getElementById('repPagination').innerHTML = '';
        return;
      }

      const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'});
      };

      tbody.innerHTML = data.items.map(r => {
        if (repGranularity === 'daily') {
          let statusBadge = '<span class="badge badge-green">OK</span>';
          if (!r.is_present) statusBadge = '<span class="badge badge-red">Ausente</span>';
          else if (r.missing_punches) statusBadge = '<span class="badge badge-yellow">Incompleto</span>';
          else if (r.is_late) statusBadge = '<span class="badge badge-yellow">Tardanza</span>';

          const isSplit = r.schedule_type === 'split';

          return `
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px">
                <div class="emp-avatar">${r.employee_name.charAt(0)}</div>
                <span style="font-weight:600">${r.employee_name}</span>
              </div></td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
              <td>${isSplit ? 'Partido' : (r.schedule_type === 'continuous' ? 'Continuo' : 'Sin Horario')}</td>
              <td style="font-weight:600;font-family:monospace;">${formatTime(r.punches.entry_1)}</td>
              <td style="color:var(--text-2);font-family:monospace;">${isSplit ? formatTime(r.punches.exit_1) : '—'}</td>
              <td style="color:var(--text-2);font-family:monospace;">${isSplit ? formatTime(r.punches.entry_2) : '—'}</td>
              <td style="font-weight:600;font-family:monospace;">${isSplit ? formatTime(r.punches.exit_2) : formatTime(r.punches.exit_1)}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        } else {
          const pStart = new Date(r.period_start + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit'});
          const pEnd = new Date(r.period_end + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit', year:'numeric'});
          
          return `
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px">
                <div class="emp-avatar">${r.employee_name.charAt(0)}</div>
                <span style="font-weight:600">${r.employee_name}</span>
              </div></td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2)">${pStart} - ${pEnd}</td>
              <td>${r.schedule_type === 'split' ? 'Partido' : (r.schedule_type === 'continuous' ? 'Continuo' : 'Sin Horario')}</td>
              <td>${r.is_present ? '<span class="badge badge-green">Sí</span>' : '<span class="badge badge-red">No</span>'}</td>
              <td>${r.is_late ? '<span class="badge badge-yellow">Sí</span>' : '<span class="badge badge-green">No</span>'}</td>
              <td>${r.missing_punches ? '<span class="badge badge-yellow">Sí</span>' : '<span class="badge badge-green">No</span>'}</td>
              <td style="font-weight:600;">${r.total_raw_events}</td>
            </tr>
          `;
        }
      }).join('');

      const pag = document.getElementById('repPagination');
      pag.innerHTML = `
        <span class="pagination-info">${data.total} registros — Página ${data.page} de ${data.pages}</span>
        <div class="pagination-btns">
          <button class="page-btn" ${data.page <= 1 ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page - 1})">← Anterior</button>
          <button class="page-btn" ${data.page >= data.pages ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page + 1})">Siguiente →</button>
        </div>
      `;

    } catch (e) {
      console.error(e);
      Toast.show('Error cargando tabla de reportes', 'error');
    }
  },

  onGranularityChange() {
    this.loadReportTable(1);
  },

  exportReport(format) {
    const token = API.token();
    const repEmployee = document.getElementById('repEmployee').value;
    const repGranularity = document.getElementById('repGranularity').value;
    const range = document.getElementById('repDateRange').value;
    
    const params = new URLSearchParams({
      granularity: repGranularity,
      export: format
    });

    if (repEmployee) params.set('employee_id', repEmployee);
    
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) params.set('date_from', dates[0]);
      if (dates.length > 1 && dates[1]) params.set('date_to', dates[1]);
      else if (dates.length === 1 && dates[0]) params.set('date_to', dates[0]);
    }

    fetch(`/api/reports/report?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        a.download = `reporte_asistencia_${repGranularity}_${new Date().toISOString().split('T')[0]}.${ext}`;
        a.click();
        Toast.show(`Reporte ${format.toUpperCase()} descargado`, 'success');
      })
      .catch(() => Toast.show(`Error generando reporte ${format.toUpperCase()}`, 'error'));
  }
};
