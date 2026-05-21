/* attendance.js — Registros de asistencia */

const AttendancePage = {
  page: 1, filters: {},

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Asistencia</div>
        <div class="section-actions">
          <input type="text" id="fSearch" placeholder="Buscar empleado o código" style="width: 200px;" />
          <input type="text" id="fDateRange" placeholder="Rango de fechas" style="width: 260px;" />
          <select id="fType">
            <option value="">Todos</option><option value="entry">Entradas</option><option value="exit">Salidas</option>
          </select>
          <button class="btn btn-primary" id="btnFilter">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filtrar
          </button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Empleado</th>
              <th>Código</th>
              <th>Departamento</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Entrada</th>
              <th>Sal. Almuerzo</th>
              <th>Ret. Almuerzo</th>
              <th>Salida</th>
              <th>Estado</th>
            </tr></thead>
            <tbody id="attTable">
              ${[1,2,3,4,5].map(() => `<tr>
                <td><div style="display:flex;gap:10px;align-items:center"><div class="skeleton sk-avatar"></div><div class="skeleton sk-text w-75" style="margin:0"></div></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination" id="attPag"></div>
      </div>`;

    // Inicializar Flatpickr con localización en español y formato estético de rango
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    flatpickr("#fDateRange", { 
      mode: "range", 
      locale: "es", 
      showMonths: 2,
      dateFormat: "Y-m-d", 
      altInput: true, 
      altFormat: "d M Y", 
      defaultDate: [firstDay, today] 
    });

    document.getElementById('btnFilter').addEventListener('click', () => { this.page = 1; this.loadTable(); });
    await this.loadTable();
  },

  async loadTable() {
    const p = new URLSearchParams({ page: this.page, page_size: 50 });
    const search = document.getElementById('fSearch').value;
    const range = document.getElementById('fDateRange').value;
    const type = document.getElementById('fType').value;
    if (search) p.set('search', search);
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) p.set('date_from', dates[0]);
      if (dates.length > 1 && dates[1]) p.set('date_to', dates[1]);
      else if (dates.length === 1 && dates[0]) p.set('date_to', dates[0]);
    }
    if (type) p.set('event_type', type);

    try {
      const data = await API.get(`/api/attendance/daily-summary?${p}`);
      const tbody = document.getElementById('attTable');
      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div><h3>Sin registros</h3><p>No se encontraron registros diarios para estos filtros.</p></div></td></tr>`;
        document.getElementById('attPag').innerHTML = '';
        return;
      }
      
      const formatTime = (isoString) => {
          if (!isoString) return '-';
          return new Date(isoString).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
      };
      
      tbody.innerHTML = data.items.map(r => {
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
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem;font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
          <td style="color:var(--text-2)">${r.department}</td>
          <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
          <td>${isSplit ? 'Partida' : (r.schedule_type === 'continuous' ? 'Continua' : 'Sin Horario')}</td>
          <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${formatTime(r.punches.entry_1)}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-2)">${isSplit ? formatTime(r.punches.exit_1) : '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-2)">${isSplit ? formatTime(r.punches.entry_2) : '—'}</td>
          <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_2) : formatTime(r.punches.exit_1)}</td>
          <td>${statusBadge}</td>
        </tr>`;
      }).join('');

      // Paginación
      const pag = document.getElementById('attPag');
      pag.innerHTML = `
        <span class="pagination-info">${data.total} registros — Página ${data.page} de ${data.pages}</span>
        <div class="pagination-btns">
          <button class="page-btn" ${data.page<=1?'disabled':''} onclick="AttendancePage.goPage(${data.page-1})">← Anterior</button>
          <button class="page-btn" ${data.page>=data.pages?'disabled':''} onclick="AttendancePage.goPage(${data.page+1})">Siguiente →</button>
        </div>`;
    } catch(e) { Toast.show('Error cargando asistencia', 'error'); }
  },

  goPage(p) { this.page = p; this.loadTable(); },

  methodLabel(m) {
    const map = { faceNotCompare: '👤 Facial', cardNotCompare: '💳 Tarjeta', faceAndCard: '👤+💳 Ambos' };
    return map[m] || m || '-';
  },
};
