/* reports_table.js — Records Table sub-module (Detailed Table, Pagination, Row Statuses) */

const ReportsTable = {
  reportPage: 1,

  async loadReportTable(page = 1) {
    this.reportPage = page;
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const repGranularity = document.getElementById('recGranularity').value;
    const { date_from, date_to } = ReportsPage.getDates('recDateRange');
    
    const params = new URLSearchParams({
      page: this.reportPage,
      page_size: 15,
      granularity: repGranularity
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    const tbody = document.getElementById('repTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = Array.from({length: 4}).map(() => `<tr>
      <td colspan="10"><div class="skeleton sk-text w-100" style="height:22px; margin:4px 0;"></div></td>
    </tr>`).join('');

    try {
      const data = await API.get(`/api/reports/report?${params}`);
      const thead = document.getElementById('repTableHead');
      if (!thead) return;
      
      // Adaptar el encabezado de la tabla según la Granularidad
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
            <th>Asistió</th>
            <th>Tardanzas</th>
            <th>Incompletos</th>
            <th>Eventos Totales</th>
          </tr>
        `;
      }

      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><h3>Sin registros de asistencia</h3><p>No se encontraron marcas de reloj para el empleado o rango de fechas seleccionado.</p></div></td></tr>`;
        const pag = document.getElementById('repPagination');
        if (pag) pag.innerHTML = '';
        return;
      }

      const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'});
      };

      tbody.innerHTML = data.items.map(r => {
        if (repGranularity === 'daily') {
          let statusBadge = '<span class="corp-badge corp-badge-present">OK</span>';
          if (!r.is_present) statusBadge = '<span class="corp-badge corp-badge-absent">Ausente</span>';
          else if (r.missing_punches) statusBadge = '<span class="corp-badge corp-badge-late">Incompleto</span>';
          else if (r.is_late) statusBadge = '<span class="corp-badge corp-badge-late">Tardanza</span>';

          const isSplit = r.schedule_type === 'split';
          const typeBadge = isSplit ? '<span class="corp-badge corp-badge-rest">Partido</span>' : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continua</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>');

          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
              <td>${typeBadge}</td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${formatTime(r.punches.entry_1)}</td>
              <td style="color:var(--text-3);font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_1) : '—'}</td>
              <td style="color:var(--text-3);font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.entry_2) : '—'}</td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_2) : formatTime(r.punches.exit_1)}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        } else {
          const pStart = new Date(r.period_start + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit'});
          const pEnd = new Date(r.period_end + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit', year:'numeric'});
          
          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2); font-weight:500;">${pStart} - ${pEnd}</td>
              <td>${r.schedule_type === 'split' ? '<span class="corp-badge corp-badge-rest">Partido</span>' : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continuo</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>')}</td>
              <td>${r.is_present ? '<span class="corp-badge corp-badge-present">Sí</span>' : '<span class="corp-badge corp-badge-absent">No</span>'}</td>
              <td>${r.is_late ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
              <td>${r.missing_punches ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
              <td style="font-weight:600; font-family:'JetBrains Mono',monospace; text-align:center;">${r.total_raw_events}</td>
            </tr>
          `;
        }
      }).join('');

      // Generar paginación limpia
      const pag = document.getElementById('repPagination');
      if (pag) {
        pag.innerHTML = `
          <span class="pagination-info">${data.total} registros encontrados — Página ${data.page} de ${data.pages}</span>
          <div class="pagination-btns" style="display:flex; gap:8px;">
            <button class="page-btn" ${data.page <= 1 ? 'disabled' : ''} onclick="ReportsTable.loadReportTable(${data.page - 1})" style="display:flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Anterior
            </button>
            <button class="page-btn" ${data.page >= data.pages ? 'disabled' : ''} onclick="ReportsTable.loadReportTable(${data.page + 1})" style="display:flex;align-items:center;gap:6px;">
              Siguiente <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        `;
      }

    } catch (e) {
      console.error(e);
      Toast.show('Error al refrescar tabla de reportes', 'error');
    }
  }
};
