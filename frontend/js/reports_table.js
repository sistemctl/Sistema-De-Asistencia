/* reports_table.js — Records Table sub-module (Detailed Table, Pagination, Row Statuses) */

const titleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

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
      
      // Adaptar el encabezado de la tabla según la Granularidad con alineación estructurada
      if (repGranularity === 'daily') {
        thead.innerHTML = `
          <tr>
            <th style="text-align: left; padding: 12px 16px;">Empleado</th>
            <th style="text-align: left; padding: 12px 16px;">Código</th>
            <th style="text-align: left; padding: 12px 16px;">Departamento</th>
            <th style="text-align: left; padding: 12px 16px;">Fecha</th>
            <th style="text-align: left; padding: 12px 16px;">Horario</th>
            <th style="text-align: center; padding: 12px 16px;">Entrada</th>
            <th style="text-align: center; padding: 12px 16px;">Sal. Alm.</th>
            <th style="text-align: center; padding: 12px 16px;">Ret. Alm.</th>
            <th style="text-align: center; padding: 12px 16px;">Salida</th>
            <th style="text-align: center; padding: 12px 16px;">Estado</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th style="text-align: left; padding: 12px 16px;">Empleado</th>
            <th style="text-align: left; padding: 12px 16px;">Código</th>
            <th style="text-align: left; padding: 12px 16px;">Departamento</th>
            <th style="text-align: left; padding: 12px 16px;">Período</th>
            <th style="text-align: left; padding: 12px 16px;">Horario</th>
            <th style="text-align: center; padding: 12px 16px;">Asistió</th>
            <th style="text-align: center; padding: 12px 16px;">Tardanzas</th>
            <th style="text-align: center; padding: 12px 16px;">Incompletos</th>
            <th style="text-align: center; padding: 12px 16px;">Eventos Totales</th>
          </tr>
        `;
      }

      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><h3>Sin registros de asistencia</h3><p>No se encontraron marcas de reloj para el empleado o rango de fechas seleccionado.</p></div></td></tr>`;
        const pag = document.getElementById('repPagination');
        if (pag) pag.innerHTML = '';
        return;
      }

      const formatTime = (isoString, method) => {
        if (!isoString) return '<span style="color: var(--text-3); font-weight: normal;">—</span>';
        let methodTag = '';
        if (method) {
          const m = method.toLowerCase();
          if (m.includes('face') || m.includes('facial')) {
            methodTag = '<div style="font-size:0.65rem; color:var(--success); font-weight:700; margin-top:2px;">👤 Facial</div>';
          } else if (m.includes('qr')) {
            methodTag = '<div style="font-size:0.65rem; color:var(--accent); font-weight:700; margin-top:2px;">📱 Código QR</div>';
          } else if (m.includes('card') || m.includes('tarjeta') || m.includes('m1')) {
            methodTag = '<div style="font-size:0.65rem; color:var(--accent-3); font-weight:700; margin-top:2px;">💳 Tarjeta</div>';
          } else if (m.includes('finger') || m.includes('huella')) {
            methodTag = '<div style="font-size:0.65rem; color:var(--warning); font-weight:700; margin-top:2px;">👆 Huella</div>';
          } else if (m === 'manual') {
            methodTag = '<div style="font-size:0.65rem; color:var(--text-3); font-weight:700; margin-top:2px;">✍️ Manual</div>';
          } else {
            methodTag = `<div style="font-size:0.65rem; color:var(--text-3); font-weight:700; margin-top:2px;">${method}</div>`;
          }
        }
        return `<span style="color: var(--text-1); font-weight: 600;">${new Date(isoString).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})}</span>${methodTag}`;
      };

      tbody.innerHTML = data.items.map(r => {
        const formattedName = titleCase(r.employee_name);
        const deptVal = (r.department && r.department.trim() !== '-' && r.department.trim() !== '') 
          ? r.department 
          : '<span style="color:var(--text-3); font-style:italic;">Sin departamento</span>';

        if (repGranularity === 'daily') {
          const hasPunch = r.is_present || (r.punches && (r.punches.entry_1 || r.punches.exit_1 || r.punches.entry_2 || r.punches.exit_2));
          let statusBadge = '<span class="corp-badge corp-badge-present">PRESENTE</span>';
          if (!hasPunch) {
            if (r.is_holiday) {
              statusBadge = '<span class="corp-badge corp-badge-holiday">Festivo</span>';
            } else if (r.is_off) {
              statusBadge = '<span class="corp-badge corp-badge-rest">Descanso</span>';
            } else {
              statusBadge = '<span class="corp-badge corp-badge-absent">Ausente</span>';
            }
          }

          const isSplit = r.schedule_type === 'split';
          const isFlexible = r.schedule_type === 'flexible';
          const typeBadge = isSplit 
            ? '<span class="corp-badge corp-badge-rest">Partido</span>' 
            : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continua</span>' : (isFlexible ? '<span class="corp-badge corp-badge-holiday">Flexible</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>'));

          // Formatear fecha más legible (ej: 10 Jun 2026)
          const formattedDate = new Date(r.date + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'short', year:'numeric'});

          const methods = r.auth_methods || {};

          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
                  <span style="font-weight:600">${formattedName}</span>
                </div>
              </td>
              <td><code style="background:var(--bg-base); border: 1px solid var(--border); padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace; color: var(--text-2);">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${deptVal}</td>
              <td style="color:var(--text-2); font-family:'JetBrains Mono',monospace;">${formattedDate}</td>
              <td>${typeBadge}</td>
              <td style="font-family:'JetBrains Mono',monospace; text-align:center; vertical-align:middle;">${formatTime(r.punches.entry_1, methods.entry_1)}</td>
              <td style="font-family:'JetBrains Mono',monospace; text-align:center; vertical-align:middle;">${isSplit ? formatTime(r.punches.exit_1, methods.exit_1) : '<span style="color:var(--text-3)">—</span>'}</td>
              <td style="font-family:'JetBrains Mono',monospace; text-align:center; vertical-align:middle;">${isSplit ? formatTime(r.punches.entry_2, methods.entry_2) : '<span style="color:var(--text-3)">—</span>'}</td>
              <td style="font-family:'JetBrains Mono',monospace; text-align:center; vertical-align:middle;">${isSplit ? formatTime(r.punches.exit_2, methods.exit_2) : formatTime(r.punches.exit_1, methods.exit_1)}</td>
              <td style="text-align:center; vertical-align:middle;">${statusBadge}</td>
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
                  <span style="font-weight:600">${formattedName}</span>
                </div>
              </td>
              <td><code style="background:var(--bg-base); border: 1px solid var(--border); padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace; color: var(--text-2);">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${deptVal}</td>
              <td style="color:var(--text-2); font-weight:500;">${pStart} - ${pEnd}</td>
              <td>${r.schedule_type === 'split' ? '<span class="corp-badge corp-badge-rest">Partido</span>' : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continuo</span>' : (r.schedule_type === 'flexible' ? '<span class="corp-badge corp-badge-holiday">Flexible</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>'))}</td>
              <td style="text-align:center;">${r.is_present ? '<span class="corp-badge corp-badge-present">Sí</span>' : '<span class="corp-badge corp-badge-absent">No</span>'}</td>
              <td style="text-align:center;">${r.is_late ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
              <td style="text-align:center;">${r.missing_punches ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
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
