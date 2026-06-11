/* reports_analytics.js — Analytics sub-module (KPIs, Charts, Comparative Table, Metric Details) */

const ReportsAnalytics = {
  doughnutChart: null,
  lineChart: null,

  // Carga KPIs y Gráficos Sincronizados
  async loadAnalytics() {
    try {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const { date_from, date_to } = ReportsPage.getDates('anDateRange');
      
      const params = new URLSearchParams();
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      if (filterVal) {
        const text = document.getElementById('anFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }
      
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
      if (deptId) params.set('department_id', deptId);
      if (posId) params.set('position_id', posId);
      if (schedId) params.set('schedule_id', schedId);

      const data = await API.get(`/api/reports/analytics?${params}`);

      // Actualizar valores de los KPIs en la UI
      document.getElementById('anTasaAsistencia').textContent = data.kpis.punctuality_rate;
      this.updateTrendBadge('anTasaAsistenciaTrend', data.kpis.punctuality_rate_trend, false);
      
      document.getElementById('anTotalTardanzas').textContent = data.kpis.total_lates;
      this.updateCountTrendBadge('anTotalTardanzasTrend', data.kpis.total_lates_trend, true);
      
      document.getElementById('anDiaCritico').textContent = data.kpis.critical_day;
      
      document.getElementById('anTasaAusencia').textContent = data.kpis.absence_rate;
      this.updateTrendBadge('anTasaAusenciaTrend', data.kpis.absence_rate_trend, true);
      
      document.getElementById('anHorasTrabajadas').textContent = data.kpis.hours_worked;
      this.updateCountTrendBadge('anHorasTrabajadasTrend', data.kpis.hours_worked_trend, false);
      
      document.getElementById('anSalidasTempranas').textContent = data.kpis.early_exits;
      this.updateCountTrendBadge('anSalidasTempranasTrend', data.kpis.early_exits_trend, true);

      // Renderizar Doughnut Chart
      const dCanvas = document.getElementById('anDoughnutChart');
      if (dCanvas) {
        const dCtx = dCanvas.getContext('2d');
        if (this.doughnutChart) this.doughnutChart.destroy();
        this.doughnutChart = new Chart(dCtx, {
          type: 'doughnut',
          data: {
            labels: ['A tiempo', 'Tardanza', 'Ausente', 'Licencia'],
            datasets: [{
              data: [
                data.distribution.ontime, 
                data.distribution.late, 
                data.distribution.absent, 
                data.distribution.leaves
              ],
              backgroundColor: [
                'rgba(0, 230, 118, 0.85)', // Cyan/Cian success
                'rgba(255, 179, 0, 0.85)',  // Yellow warning
                'rgba(255, 61, 0, 0.85)',   // Red danger
                'rgba(170, 0, 255, 0.85)'   // Purple accent
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
            cutout: '72%',
            onClick: (e, activeElements) => {
              if (activeElements && activeElements.length > 0) {
                const index = activeElements[0].index;
                const label = this.doughnutChart.data.labels[index];
                if (label === 'A tiempo') {
                  this.showMetricDetails('punctuality');
                } else if (label === 'Tardanza') {
                  this.showMetricDetails('lates');
                } else if (label === 'Ausente') {
                  this.showMetricDetails('absences');
                } else if (label === 'Licencia') {
                  Toast.show('Detalles de Licencia: se gestionan en la sección de Justificaciones.', 'info');
                }
              } else {
                this.openChartFullscreen('doughnut');
              }
            }
          }
        });
      }

      // Renderizar Line Chart
      const lCanvas = document.getElementById('anLineChart');
      if (lCanvas) {
        const lCtx = lCanvas.getContext('2d');
        if (this.lineChart) this.lineChart.destroy();

        const gradPresent = lCtx.createLinearGradient(0, 0, 0, 200);
        gradPresent.addColorStop(0, 'rgba(0, 230, 118, 0.2)');
        gradPresent.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

        const gradLate = lCtx.createLinearGradient(0, 0, 0, 200);
        gradLate.addColorStop(0, 'rgba(255, 179, 0, 0.2)');
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
                grid: { color: 'rgba(255,255,255,.015)' } 
              },
              y: { 
                ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9, weight: 500 }, stepSize: 1 }, 
                grid: { color: 'rgba(255,255,255,.015)' } 
              }
            },
            onClick: (e, activeElements) => {
              if (activeElements && activeElements.length > 0) {
                const index = activeElements[0].index;
                const dateLabel = this.lineChart.data.labels[index];
                this.showDayDetails(dateLabel);
              } else {
                this.openChartFullscreen('line');
              }
            }
          }
        });
        // Make canvases click-to-fullscreen / interact
        if (dCanvas) {
          dCanvas.style.cursor = 'pointer';
          dCanvas.title = 'Hacer clic en segmentos para ver detalles o fuera para pantalla completa';
        }
        if (lCanvas) {
          lCanvas.style.cursor = 'pointer';
          lCanvas.title = 'Hacer clic en puntos para ver detalles del día o fuera para pantalla completa';
        }
      }
    } catch(e) {
      console.error(e);
      Toast.show('Error al refrescar analíticas', 'error');
    }
  },

  openChartFullscreen(chartType) {
    const isDoughnut = chartType === 'doughnut';
    const chartTitle = isDoughnut ? 'Distribución de Estados' : 'Puntualidad en Entradas (Tendencia)';
    
    Modal.open(chartTitle, `
      <div style="width: 100%; height: 500px; display: flex; justify-content: center; align-items: center; background: var(--bg-raised); border-radius: 12px; padding: 20px;">
        <canvas id="fullscreenChartCanvas"></canvas>
      </div>
    `, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
    
    const fsCanvas = document.getElementById('fullscreenChartCanvas');
    if (fsCanvas) {
      const fsCtx = fsCanvas.getContext('2d');
      const sourceChart = isDoughnut ? this.doughnutChart : this.lineChart;
      if (sourceChart) {
        if (isDoughnut) {
          new Chart(fsCtx, {
            type: 'doughnut',
            data: sourceChart.data,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: document.documentElement.classList.contains('dark-theme') ? '#cbd5e1' : '#0b1c30',
                    font: { family: 'Plus Jakarta Sans', size: 14, weight: 600 }
                  }
                }
              },
              cutout: '70%'
            }
          });
        } else {
          const gradPresent = fsCtx.createLinearGradient(0, 0, 0, 400);
          gradPresent.addColorStop(0, 'rgba(0, 230, 118, 0.35)');
          gradPresent.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

          const gradLate = fsCtx.createLinearGradient(0, 0, 0, 400);
          gradLate.addColorStop(0, 'rgba(255, 179, 0, 0.35)');
          gradLate.addColorStop(1, 'rgba(255, 179, 0, 0.0)');

          new Chart(fsCtx, {
            type: 'line',
            data: {
              labels: sourceChart.data.labels,
              datasets: [
                {
                  label: 'A tiempo',
                  data: sourceChart.data.datasets[0].data,
                  borderColor: 'rgba(0, 230, 118, 0.9)',
                  backgroundColor: gradPresent,
                  fill: true,
                  tension: 0.3,
                  borderWidth: 3
                },
                {
                  label: 'Tardanzas',
                  data: sourceChart.data.datasets[1].data,
                  borderColor: 'rgba(255, 179, 0, 0.9)',
                  backgroundColor: gradLate,
                  fill: true,
                  tension: 0.3,
                  borderWidth: 3
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    color: document.documentElement.classList.contains('dark-theme') ? '#cbd5e1' : '#0b1c30',
                    font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 }
                  }
                }
              },
              scales: {
                x: { 
                  ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11, weight: 500 } }, 
                  grid: { color: 'rgba(255,255,255,.03)' } 
                },
                y: { 
                  ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 11, weight: 500 }, stepSize: 1 }, 
                  grid: { color: 'rgba(255,255,255,.03)' } 
                }
              }
            }
          });
        }
      }
    }
  },

  async loadComparativeAnalytics() {
    const container = document.getElementById('repAnalyticsTableContainer');
    if (!container) return;

    const getEntityHeader = () => {
      if (ReportsPage.currentTab === 'general') return 'Empleado';
      if (ReportsPage.currentTab === 'departments') return 'Departamento';
      if (ReportsPage.currentTab === 'positions') return 'Cargo';
      if (ReportsPage.currentTab === 'schedules') return 'Horario';
      return 'Nombre';
    };

    container.innerHTML = `
      <div class="double-bezel-outer">
        <div class="double-bezel-inner" style="border:none; box-shadow:none; padding:0;">
        <div class="card-header">
          <div>
            <div class="card-title" style="font-size: 1.1rem; color: var(--accent);">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Tabla Comparativa de Analíticas
            </div>
            <div class="card-sub">Resumen de puntualidad y métricas clave de todos los elementos en el periodo seleccionado</div>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th style="padding: 12px 16px;">${getEntityHeader()}</th>
                <th style="text-align:center; padding: 12px 16px;">Puntualidad</th>
                <th style="text-align:center; padding: 12px 16px;">Total Tardanzas</th>
                <th style="text-align:center; padding: 12px 16px;">Hora Promedio Entrada</th>
                <th style="text-align:center; padding: 12px 16px;">Día Crítico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" style="text-align:center; color:var(--text-3); padding: 40px 20px;">
                  <div class="spinner" style="margin: 0 auto 12px;"></div>
                  Cargando métricas comparativas...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
    `;

    const { date_from, date_to } = ReportsPage.getDates('anDateRange');

    try {
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      
      const params = new URLSearchParams();
      params.set('entity_type', ReportsPage.currentTab || 'general');
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);
      if (deptId) params.set('department_id', deptId);
      if (posId) params.set('position_id', posId);
      if (schedId) params.set('schedule_id', schedId);
      
      if (filterVal) {
        const text = document.getElementById('anFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }

      const results = await API.get(`/api/reports/analytics/batch?${params}`) || [];

      if (!results.length) {
        container.querySelector('tbody').innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; color:var(--text-3); padding: 30px 20px;">
              No hay elementos registrados para mostrar.
            </td>
          </tr>
        `;
        return;
      }

      const tbody = container.querySelector('tbody');
      tbody.innerHTML = results.map(r => {
        const rateVal = parseFloat(r.punctuality);
        let badgeClass = 'badge-gray';
        if (!isNaN(rateVal)) {
          if (rateVal >= 90) badgeClass = 'badge-green';
          else if (rateVal >= 70) badgeClass = 'badge-yellow';
          else badgeClass = 'badge-red';
        }
        return `
          <tr style="transition: background 0.2s;">
            <td style="font-weight:600; color:var(--text-1); padding: 12px 16px;">
              ${r.name} ${r.code ? `<code style="background:var(--surface-3);padding:2px 6px;border-radius:4px;font-size:.7rem;margin-left:8px;font-family:'JetBrains Mono',monospace;">${r.code}</code>` : ''}
            </td>
            <td style="text-align:center; padding: 12px 16px;">
              <span class="badge ${badgeClass}">${r.punctuality}</span>
            </td>
            <td style="text-align:center; font-weight:600; color:var(--text-2); font-family:'JetBrains Mono',monospace; padding: 12px 16px;">
              ${r.lates}
            </td>
            <td style="text-align:center; color:var(--text-2); font-family:'JetBrains Mono',monospace; padding: 12px 16px;">
              ${r.avg_entry}
            </td>
            <td style="text-align:center; color:var(--text-2); padding: 12px 16px;">
              ${r.critical}
            </td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      console.error('Error al generar la tabla comparativa', e);
      container.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:var(--danger); padding: 20px;">
            Error al generar los datos de la tabla comparativa.
          </td>
        </tr>
      `;
    }
  },

  async showMetricDetails(type) {
    const titles = {
      punctuality: 'Ranking de Puntualidad en el Período',
      lates: 'Detalle de Tardanzas en el Período',
      avg_entry: 'Promedio de Hora de Entrada en el Período',
      critical_day: 'Tasa de Asistencia por Día de la Semana',
      hours_worked: 'Ranking de Horas Trabajadas en el Período',
      early_exits: 'Detalle de Salidas Tempranas en el Período',
      absences: 'Detalle de Inasistencias en el Período'
    };

    Toast.show('Cargando detalles de analítica...', 'info');

    try {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const { date_from, date_to } = ReportsPage.getDates('anDateRange');
      
      const params = new URLSearchParams({ type });
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      if (filterVal) {
        const text = document.getElementById('anFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }
      
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
      if (deptId) params.set('department_id', deptId);
      if (posId) params.set('position_id', posId);
      if (schedId) params.set('schedule_id', schedId);

      const data = await API.get(`/api/reports/analytics/details?${params}`);

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
        `;

        if (type === 'punctuality') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px; text-align: center;">Entradas</th>
                  <th style="padding: 12px 16px; text-align: center;">A Tiempo</th>
                  <th style="padding: 12px 16px; text-align: center;">Tardanzas</th>
                  <th style="padding: 12px 16px; text-align: center;">Puntualidad</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => {
                  const rateNum = parseFloat(emp.rate);
                  const rateColor = rateNum >= 90 ? 'var(--success)' : rateNum >= 75 ? 'var(--warning)' : 'var(--danger)';
                  return `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${emp.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${emp.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${emp.department}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${emp.total_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--success); font-weight: 600;">${emp.ontime_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--warning); font-weight: 600;">${emp.late_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: ${rateColor}; font-weight: 700;">${emp.rate}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'lates') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Fecha</th>
                  <th style="padding: 12px 16px;">H. Entrada Prog.</th>
                  <th style="padding: 12px 16px;">H. Entrada Real</th>
                  <th style="padding: 12px 16px;">Retraso</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-1); font-weight: 500;">${row.date}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                    <td style="padding: 12px 16px; color: var(--text-1);">${row.entry_time}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--warning);">${row.delay}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'avg_entry') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Entrada Horario</th>
                  <th style="padding: 12px 16px;">Promedio de Entrada</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--accent);">${row.avg_entry}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'critical_day') {
          html += `
                  <th style="padding: 12px 16px;">Día</th>
                  <th style="padding: 12px 16px; text-align: center;">Total Entradas</th>
                  <th style="padding: 12px 16px; text-align: center;">A Tiempo</th>
                  <th style="padding: 12px 16px; text-align: center;">Tardanzas</th>
                  <th style="padding: 12px 16px; text-align: center;">Puntualidad</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => {
                  const rateNum = parseFloat(row.rate);
                  const rateColor = rateNum >= 90 ? 'var(--success)' : rateNum >= 75 ? 'var(--warning)' : 'var(--danger)';
                  return `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-1);">${row.day_name}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${row.total_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--success); font-weight: 600;">${row.ontime_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--warning); font-weight: 600;">${row.late_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: ${rateColor}; font-weight: 700;">${row.rate}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'hours_worked') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px; text-align: center;">Días Trabajados</th>
                  <th style="padding: 12px 16px; text-align: center;">Total Horas</th>
                  <th style="padding: 12px 16px; text-align: center;">Promedio Diario</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${row.days_worked}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--accent); font-weight: 600;">${row.total_hours} h</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${row.avg_daily_hours} h</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'early_exits') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Fecha</th>
                  <th style="padding: 12px 16px;">H. Salida Real</th>
                  <th style="padding: 12px 16px;">H. Salida Prog.</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-1); font-weight: 500;">${row.date}</td>
                    <td style="padding: 12px 16px; color: var(--warning); font-weight: 600;">${row.exit_time}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'absences') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Fecha Inasistencia</th>
                  <th style="padding: 12px 16px;">Detalle</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--danger); font-weight: 600;">${row.date}</td>
                    <td style="padding: 12px 16px; color: var(--text-3); font-style: italic;">${row.detail}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        }
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

  updateTrendBadge(elementId, trendVal, isLowerBetter = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (trendVal === undefined || trendVal === null) {
      el.style.display = 'none';
      return;
    }
    
    el.style.display = 'inline-flex';
    let sign = '';
    if (trendVal > 0) sign = '+';
    
    el.textContent = `${sign}${trendVal}%`;
    el.className = 'trend-badge';
    
    if (trendVal === 0) {
      el.textContent = '0%';
      el.classList.add('trend-neutral');
    } else {
      const isPositiveChange = trendVal > 0;
      const isGood = isLowerBetter ? !isPositiveChange : isPositiveChange;
      if (isGood) {
        el.classList.add('trend-up');
      } else {
        el.classList.add('trend-down');
      }
    }
  },

  updateCountTrendBadge(elementId, trendVal, isLowerBetter = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (trendVal === undefined || trendVal === null) {
      el.style.display = 'none';
      return;
    }
    
    el.style.display = 'inline-flex';
    let sign = '';
    if (trendVal > 0) sign = '+';
    
    el.textContent = `${sign}${trendVal}`;
    el.className = 'trend-badge';
    
    if (trendVal === 0) {
      el.textContent = '0';
      el.classList.add('trend-neutral');
    } else {
      const isPositiveChange = trendVal > 0;
      const isGood = isLowerBetter ? !isPositiveChange : isPositiveChange;
      if (isGood) {
        el.classList.add('trend-up');
      } else {
        el.classList.add('trend-down');
      }
    }
  },

  async showDayDetails(dateLabel) {
    const { date_from } = ReportsPage.getDates('anDateRange');
    const year = date_from ? date_from.split('-')[0] : new Date().getFullYear();
    const [day, month] = dateLabel.split('/');
    const targetDate = `${year}-${month}-${day}`;
    
    Toast.show(`Cargando tardanzas del día ${dateLabel}...`, 'info');
    try {
      const data = await API.get(`/api/reports/analytics/details?type=lates&date_from=${targetDate}&date_to=${targetDate}`);
      let html = '';
      if (!data || data.length === 0) {
        html = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-3);">
            <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No se registraron tardanzas el día ${dateLabel}.</p>
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
                  <th style="padding: 12px 16px;">H. Entrada Prog.</th>
                  <th style="padding: 12px 16px;">H. Entrada Real</th>
                  <th style="padding: 12px 16px;">Retraso</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                    <td style="padding: 12px 16px; color: var(--text-1);">${row.entry_time}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--warning);">${row.delay}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      Modal.open(`Tardanzas del día ${dateLabel}`, html, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
      
      const modalEl = document.querySelector('#modalOverlay .modal');
      if (modalEl) {
        modalEl.style.maxWidth = '780px';
      }
    } catch (err) {
      Toast.show('Error al cargar detalles del día: ' + err.message, 'error');
    }
  }
};
