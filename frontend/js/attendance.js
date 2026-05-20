/* attendance.js — Registros de asistencia */

const AttendancePage = {
  page: 1, filters: {},

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Asistencia</div>
        <div class="section-actions">
          <input type="date" id="fDateFrom" class="field" style="padding:9px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;color:var(--text-1)" />
          <input type="date" id="fDateTo"   class="field" style="padding:9px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;color:var(--text-1)" />
          <select id="fType" style="padding:9px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;color:var(--text-1)">
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
            <thead><tr><th>Empleado</th><th>Código</th><th>Departamento</th><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Método</th><th>Tardanza</th></tr></thead>
            <tbody id="attTable">
              ${[1,2,3,4,5].map(() => `<tr>
                <td><div style="display:flex;gap:10px;align-items:center"><div class="skeleton sk-avatar"></div><div class="skeleton sk-text w-75" style="margin:0"></div></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination" id="attPag"></div>
      </div>`;

    // Fecha por defecto: hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fDateFrom').value = today;
    document.getElementById('fDateTo').value   = today;

    document.getElementById('btnFilter').addEventListener('click', () => { this.page = 1; this.loadTable(); });
    await this.loadTable();
  },

  async loadTable() {
    const p = new URLSearchParams({ page: this.page, page_size: 50 });
    const from = document.getElementById('fDateFrom').value;
    const to   = document.getElementById('fDateTo').value;
    const type = document.getElementById('fType').value;
    if (from) p.set('date_from', from);
    if (to)   p.set('date_to', to);
    if (type) p.set('event_type', type);

    try {
      const data = await API.get(`/api/attendance?${p}`);
      const tbody = document.getElementById('attTable');
      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div><h3>Sin registros</h3><p>Parece que no hay movimientos de asistencia para estas fechas.</p></div></td></tr>`;
        document.getElementById('attPag').innerHTML = '';
        return;
      }
      tbody.innerHTML = data.items.map(r => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div class="emp-avatar">${r.employee_name.charAt(0)}</div>
            <span style="font-weight:600">${r.employee_name}</span>
          </div></td>
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem;font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
          <td style="color:var(--text-2)">${r.department}</td>
          <td style="color:var(--text-2)">${new Date(r.event_time).toLocaleDateString('es')}</td>
          <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${new Date(r.event_time).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</td>
          <td>${r.event_type==='entry'
            ? '<span class="badge badge-green"><span class="status-dot"></span> Entrada</span>'
            : '<span class="badge badge-red"><span class="status-dot"></span> Salida</span>'}</td>
          <td style="color:var(--text-3);font-size:.78rem">${this.methodLabel(r.auth_method)}</td>
          <td>${r.is_late ? '<span class="badge badge-yellow"><span class="status-dot"></span> Tardanza</span>' : '<span class="badge badge-green">A tiempo</span>'}</td>
        </tr>`).join('');

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
