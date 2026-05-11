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
          <button class="btn btn-primary" id="btnFilter">Filtrar</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Empleado</th><th>Código</th><th>Departamento</th><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Método</th><th>Tardanza</th></tr></thead>
            <tbody id="attTable"><tr><td colspan="8"><div class="loading-overlay"><div class="spinner"></div></div></td></tr></tbody>
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
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📋</div><h3>Sin registros</h3><p>No hay eventos en este rango de fechas</p></div></td></tr>`;
        document.getElementById('attPag').innerHTML = '';
        return;
      }
      tbody.innerHTML = data.items.map(r => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div class="emp-avatar">${r.employee_name.charAt(0)}</div>
            <span style="font-weight:600">${r.employee_name}</span>
          </div></td>
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem">${r.employee_code}</code></td>
          <td style="color:var(--text-2)">${r.department}</td>
          <td style="color:var(--text-2)">${new Date(r.event_time).toLocaleDateString('es')}</td>
          <td style="font-weight:600">${new Date(r.event_time).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</td>
          <td>${r.event_type==='entry'
            ? '<span class="badge badge-green">🟢 Entrada</span>'
            : '<span class="badge badge-red">🔴 Salida</span>'}</td>
          <td style="color:var(--text-3);font-size:.78rem">${this.methodLabel(r.auth_method)}</td>
          <td>${r.is_late ? '<span class="badge badge-yellow">⏰ Tardanza</span>' : '<span class="badge badge-gray">A tiempo</span>'}</td>
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
