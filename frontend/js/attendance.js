/* attendance.js — Registros de asistencia */

const AttendancePage = {
  page: 1, filters: {},
  currentTab: 'records',

  async render(tab = 'records') {
    this.currentTab = tab;

    document.getElementById('pageContent').innerHTML = `
      <!-- Tab Nav -->
      <div style="margin-bottom:24px; border-bottom:1px solid var(--border); display:flex; gap:24px;">
        <button class="att-tab-btn active" data-tab="records" onclick="AttendancePage.switchTab('records')" style="background:none;border:none;color:var(--text-2);padding:12px 0;font-weight:600;font-size:0.95rem;cursor:pointer;position:relative;transition:color 0.2s;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Registros de Asistencia
        </button>
        <button class="att-tab-btn" data-tab="recent" onclick="AttendancePage.switchTab('recent')" style="background:none;border:none;color:var(--text-2);padding:12px 0;font-weight:600;font-size:0.95rem;cursor:pointer;position:relative;transition:color 0.2s;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Últimas Entradas del Dispositivo
        </button>

        ${Auth.canManageEmployees() ? `
          <div style="margin-left: auto; display: flex; align-items: center; margin-bottom: 8px;">
            <button class="btn btn-primary" onclick="AttendancePage.openManualPunchModal()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Reg. Marcación Manual
            </button>
          </div>
        ` : ''}
      </div>
      <style>
        .att-tab-btn.active { color: var(--accent) !important; }
        .att-tab-btn::after { content:''; position:absolute; bottom:-1px; left:0; width:100%; height:2px; background:var(--accent); transform:scaleX(0); transition:transform 0.2s ease; }
        .att-tab-btn.active::after { transform:scaleX(1); }
        .att-tab-btn:hover { color:var(--text-1) !important; }
      </style>

      <div id="attTabContent"></div>
    `;

    await this.switchTab(tab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.att-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const content = document.getElementById('attTabContent');

    if (tab === 'records') {
      content.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; margin-bottom:20px; background:var(--surface-1); padding:16px 20px; border-radius:12px; border:1px solid var(--border); width: 100%; box-sizing: border-box;">
          
          <div style="flex:1; min-width:200px;">
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Búsqueda</label>
            <input type="text" id="fSearch" class="form-control" placeholder="Buscar empleado o código..." style="width:100%;" />
          </div>

          <div style="flex:1; min-width:220px;">
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Rango de Fechas</label>
            <div style="width:100%;">
              <input type="text" id="fDateRange" class="form-control" placeholder="Seleccionar fechas" style="width:100%;" />
            </div>
          </div>

          <div style="flex: 0 1 150px; min-width: 140px;">
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Rango Rápido</label>
            <select id="fQuickRange" class="form-control" style="width:100%;" onchange="AttendancePage.setDateRange(this.value)">
              <option value="">Personalizado</option>
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este mes</option>
              <option value="last_month">Mes pasado</option>
            </select>
          </div>

          <div style="flex: 0 1 140px; min-width: 120px;">
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Tipo de Registro</label>
            <select id="fType" class="form-control" style="width:100%;">
              <option value="">Todos</option>
              <option value="entry">Entradas</option>
              <option value="exit">Salidas</option>
            </select>
          </div>

          <div style="flex: 0 0 auto;">
            <button class="btn btn-primary" id="btnFilter" style="height: 42px; display:flex; align-items:center; padding: 0 20px;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filtrar
            </button>
          </div>

        </div>

        <div class="double-bezel-outer">
          <div class="double-bezel-inner" style="border:none; box-shadow:none; padding:0;">
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Empleado</th><th>Código</th><th>Departamento</th><th>Fecha</th><th>Horario</th>
                <th>Entrada</th><th>Sal. Almuerzo</th><th>Ret. Almuerzo</th><th>Salida</th><th>Estado</th><th>Justificación</th>
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
                  <td><div class="skeleton sk-text w-50"></div></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          </div>
          <div class="pagination" id="attPag"></div>
        </div>
      </div>`;

      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      this._fp = flatpickr('#fDateRange', {
        mode: 'range', locale: 'es', showMonths: 2,
        dateFormat: 'Y-m-d', altInput: true, altFormat: 'd M Y',
        defaultDate: [firstDay, today],
        onClose: (selectedDates) => {
          if (selectedDates.length === 2 || selectedDates.length === 1) {
            this.page = 1;
            this.loadTable();
          }
        }
      });
      
      let searchTimeout = null;
      document.getElementById('fSearch').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.page = 1; this.loadTable();
        }, 300);
      });

      document.getElementById('fType').addEventListener('change', () => {
        this.page = 1; this.loadTable();
      });

      document.getElementById('btnFilter').addEventListener('click', () => { this.page = 1; this.loadTable(); });
      await this.loadTable();

    } else if (tab === 'recent') {
      content.innerHTML = `
        <div class="double-bezel-outer">
          <div class="double-bezel-inner" style="border:none; box-shadow:none; padding:0;">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Últimas Entradas del Dispositivo
              </div>
              <div class="card-sub">Movimientos registrados hoy en el biométrico</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="AttendancePage.loadRecent()">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Actualizar
            </button>
          </div>
          <div class="event-list" id="recentListAtt" style="max-height:600px;overflow-y:auto;">
            ${[1,2,3,4,5,6].map(() => `
              <div class="event-item">
                <div class="skeleton sk-avatar"></div>
                <div style="flex:1"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-text w-75"></div></div>
              </div>`).join('')}
          </div>
          </div>
        </div>
      </div>`;

      await this.loadRecent();
    }
  },

  setDateRange(range) {
    if (!this._fp) return;
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (range === 'today') {
      // already set
    } else if (range === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (range === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    
    this._fp.setDate([start, end]);
    document.getElementById('fQuickRange').value = ''; // Reset select visually
    // Auto submit filter when a quick button is pressed
    document.getElementById('btnFilter').click();
  },

  async loadTable(page = 1) {
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

      // Guardar items cargados para justificaciones u otros modales
      AttendancePage.currentItems = data.items || [];
      
      const formatTime = (isoString) => {
          if (!isoString) return '-';
          return new Date(isoString).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
      };
      
      tbody.innerHTML = data.items.map(r => {
        let statusBadge = '<span class="badge badge-green">OK</span>';
        if (!r.is_present) {
          if (r.is_holiday) {
            statusBadge = '<span class="badge badge-purple">Festivo</span>';
          } else if (r.is_off) {
            statusBadge = '<span class="badge badge-gray">Descanso</span>';
          } else {
            statusBadge = '<span class="badge badge-red">Ausente</span>';
          }
        }
        else if (r.missing_punches) statusBadge = '<span class="badge badge-yellow">Incompleto</span>';
        else if (r.is_late) statusBadge = '<span class="badge badge-yellow">Tardanza</span>';
        
        const isSplit = r.schedule_type === 'split';
        
        let justificationHtml = '<span style="color:var(--text-3); font-size:0.8rem;">—</span>';
        if (r.justification) {
          justificationHtml = `
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-purple" title="Razón: ${r.justification.reason.replace(/"/g, '&quot;')}" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:700; text-transform:uppercase; letter-spacing:0.02em; padding:4px 8px;" onclick="AttendancePage.openJustifyModal(${r.employee_id}, '${r.date}', '${r.employee_name.replace(/'/g, "\\'")}', '${r.justification.justification_type}')">
                ⚖️ Justificado
              </span>
              ${r.justification.document_path ? `
                <a href="/uploads/${r.justification.document_path}" target="_blank" class="btn btn-icon btn-sm btn-secondary" title="Ver comprobante adjunto" style="padding:2px; display:inline-flex; align-items:center; justify-content:center; color: var(--accent); border-color: rgba(var(--accent-rgb), 0.2);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </a>
              ` : ''}
              <button class="btn btn-icon btn-sm btn-danger" onclick="AttendancePage.removeJustification(${r.justification.id})" title="Eliminar justificación" style="padding:2px; display:inline-flex; align-items:center; justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          `;
        } else if (!r.is_present || r.is_late || r.missing_punches) {
          justificationHtml = `
            <button class="btn btn-secondary btn-sm" onclick="AttendancePage.openJustifyModal(${r.employee_id}, '${r.date}', '${r.employee_name.replace(/'/g, "\\'")}', '${!r.is_present ? 'absence' : 'lateness'}')" style="padding:3px 8px; font-size:0.72rem; font-weight:700; text-transform:uppercase; display:inline-flex; align-items:center; gap:4px; border-color:var(--border);">
              ➕ Justificar
            </button>
          `;
        }
        
        return `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="AttendancePage.showEmployeeCard(${r.employee_id}, '${r.employee_name.replace(/'/g, "\\'")}', '${r.employee_code}')" title="Ver ficha de ${r.employee_name}">
            ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
            <span style="font-weight:600;text-decoration:underline;text-decoration-color:var(--border);text-underline-offset:3px;">${r.employee_name}</span>
          </div></td>
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem;font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
          <td style="color:var(--text-2)">${r.department}</td>
          <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
          <td>${isSplit ? '<span class="badge badge-blue">Partida</span>' : (r.schedule_type === 'continuous' ? '<span class="badge badge-green">Continua</span>' : (r.schedule_type === 'flexible' ? '<span class="badge badge-purple">Flexible</span>' : '<span class="badge badge-gray">Sin Horario</span>'))}</td>
          <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${formatTime(r.punches.entry_1)}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-2)">${isSplit ? formatTime(r.punches.exit_1) : '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-2)">${isSplit ? formatTime(r.punches.entry_2) : '—'}</td>
          <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_2) : formatTime(r.punches.exit_1)}</td>
          <td>${statusBadge}</td>
          <td>${justificationHtml}</td>
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

  async loadRecent() {
    try {
      const items = await API.get('/api/dashboard/recent-events');
      const list = document.getElementById('recentListAtt');
      if (!list) return;
      if (!items?.length) {
        list.innerHTML = `<div class="empty-state" style="padding:24px"><div class="icon">✨</div><h3>¡Día tranquilo!</h3><p>Aún no hay movimientos registrados hoy.</p></div>`;
        return;
      }
      list.innerHTML = items.map(e => `
        <div class="event-item">
          ${e.photo_path ? `<div class="emp-avatar"><img src="/uploads/${e.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(e.employee_name)}
          <div style="flex:1">
            <div class="event-name">${e.employee_name}</div>
            <div class="event-sub">${e.event_type === 'entry' ? '<span style="color:var(--success)">🟢 Entrada</span>' : '<span style="color:var(--danger)">🔴 Salida</span>'}${e.is_late ? ' · <span style="color:var(--warning);font-weight:600;">Tardanza</span>' : ''}</div>
          </div>
          <div class="event-time">${this.timeAgo(e.event_time)}</div>
        </div>`).join('');
    } catch(e) { console.warn(e); }
  },

  timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return new Date(iso).toLocaleDateString('es');
  },

  async showEmployeeCard(employeeId, employeeName, employeeCode) {
    try {
      // Abrir modal con spinner mientras se carga
      Modal.openDrawer(`Ficha del Colaborador`, `<div style="text-align:center;padding:48px;"><div class="spinner" style="margin:auto;"></div><p style="margin-top:12px;color:var(--text-3);">Cargando información del empleado...</p></div>`, ``);
      
      const emp = await API.get(`/api/employees/${employeeId}`);
      if (!emp) {
        Toast.show("No se pudo cargar la información del empleado", "error");
        Modal.close();
        return;
      }

      const initial = (employeeName || '?').charAt(0).toUpperCase();

      const modalBody = `
        <!-- Banner superior mesh gradiente premium -->
        <div style="background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.8), rgba(var(--accent-2-rgb), 0.8)); margin: -30px -30px 20px -30px; padding: 40px 30px; text-align: center; color: #ffffff; border-radius: 20px 0 0 0; position: relative;">
          ${emp.photo_path 
            ? `<div class="emp-avatar" style="width: 100px; height: 100px; margin: 0 auto 12px; border: 4px solid rgba(255,255,255,0.35); box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 50%; overflow: hidden;"><img src="/uploads/${emp.photo_path}?t=${new Date().getTime()}" style="width: 100%; height: 100%; object-fit: cover;"></div>` 
            : `<div style="width: 100px; height: 100px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 850; font-size: 2.4rem; margin: 0 auto 12px; border: 4px solid rgba(255,255,255,0.35); box-shadow: 0 8px 24px rgba(0,0,0,0.15);">${initial}</div>`}
          <h3 style="margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em;">${emp.full_name}</h3>
          <span style="font-size: 0.82rem; color: rgba(255, 255, 255, 0.85); font-weight: 600;">Código del Empleado: ${emp.employee_code}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; background: var(--surface-2); padding: 20px; border-radius: 14px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <span style="color: var(--text-3); font-weight: 600;">Cargo / Rol:</span>
            <span style="color: var(--text-1); font-weight: 700;">${emp.position ? emp.position.name : '—'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <span style="color: var(--text-3); font-weight: 600;">Departamento:</span>
            <span style="color: var(--text-1); font-weight: 700;">${emp.department ? emp.department.name : '—'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <span style="color: var(--text-3); font-weight: 600;">Horario Base:</span>
            <span style="color: var(--text-1); font-weight: 700;">${emp.schedule ? emp.schedule.name : 'Sin Horario'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; padding-bottom: 2px;">
            <span style="color: var(--text-3); font-weight: 600;">Tarjeta RFID / ID:</span>
            <span style="color: var(--text-1); font-family: monospace; font-weight: 700;">${emp.card_number || '—'}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn btn-primary" onclick="Modal.close(); window.location.hash='#reports/records'; setTimeout(() => { const entityInput = document.getElementById('recFilterEntity'); const entityTextInput = document.getElementById('recFilterEntityInput'); if (entityInput && entityTextInput) { entityInput.value = ${emp.id}; entityTextInput.value = '${emp.full_name.replace(/'/g, "\\'")}'; } ReportsPage.switchReportTab('records'); ReportsPage.loadReportTable(1); }, 200);" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; font-size: 0.85rem;">
            📊 Ver Reporte Detallado
          </button>
          <button class="btn btn-secondary" onclick="Modal.close(); window.location.hash='#leaves'; setTimeout(() => { LeavesPage.openForm(); setTimeout(() => { const selectEmp = document.getElementById('leaveEmpId'); if (selectEmp) selectEmp.value = ${emp.id}; }, 200); }, 200);" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; font-size: 0.85rem;">
            💼 Registrar Novedad (Vacaciones/Incapacidad)
          </button>
          <button class="btn btn-secondary" onclick="Modal.close(); window.location.hash='#parameters'; setTimeout(() => { ParametersPage.switchTab('schedules'); setTimeout(() => { if (typeof SchedulesPage !== 'undefined') SchedulesPage.switchSubTab('matrix'); }, 150); }, 200);" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; font-size: 0.85rem;">
            📅 Ver en Calendario Semanal
          </button>
        </div>
      `;

      Modal.openDrawer(`Ficha del Colaborador`, modalBody, `<button class="btn btn-secondary" onclick="Modal.close()" style="width: 100%;">Cerrar Panel</button>`);
    } catch(err) {
      console.error(err);
      Toast.show("Error al obtener información del empleado", "error");
      Modal.close();
    }
  },

  openJustifyModal(employeeId, dateStr, employeeName, defaultType) {
    const item = (AttendancePage.currentItems || []).find(x => x.employee_id === employeeId && x.date === dateStr);
    const existingJust = item ? item.justification : null;
    const existingReason = existingJust ? existingJust.reason : '';
    const existingOverride = existingJust ? existingJust.override_status : (defaultType === 'absence' ? 'present' : 'on_time');
    const existingDocPath = existingJust ? existingJust.document_path : null;

    const html = `
      <form id="justifyForm" onsubmit="event.preventDefault(); AttendancePage.submitJustification(${employeeId}, '${dateStr}')">
        <div style="display:flex; flex-direction:column; gap:16px; padding: 4px 0;">
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Colaborador</label>
            <input type="text" value="${employeeName}" disabled style="width:100%; background:var(--surface-3); color:var(--text-3); border:1px solid var(--border); padding:8px 12px; border-radius:8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Fecha</label>
            <input type="text" value="${dateStr}" disabled style="width:100%; background:var(--surface-3); color:var(--text-3); border:1px solid var(--border); padding:8px 12px; border-radius:8px;" />
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Tipo de Justificación</label>
            <select id="justType" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1);">
              <option value="absence" ${defaultType === 'absence' ? 'selected' : ''}>Ausencia / Falta</option>
              <option value="lateness" ${defaultType === 'lateness' ? 'selected' : ''}>Tardanza / Retardo</option>
              <option value="other" ${defaultType === 'other' ? 'selected' : ''}>Otro Motivo</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Estado a Forzar (Anulación)</label>
            <select id="justOverride" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1);">
              <option value="present" ${existingOverride === 'present' ? 'selected' : ''}>Marcar como Asistido (Normal/Presente)</option>
              <option value="on_time" ${existingOverride === 'on_time' ? 'selected' : ''}>Marcar como A Tiempo (Quitar Retardo)</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Motivo / Comentario</label>
            <textarea id="justReason" placeholder="Describa el motivo de la justificación..." required style="width:100%; height:90px; resize:none; padding:10px; border:1px solid var(--border); border-radius:8px; background:var(--surface-1); color:var(--text-1); font-family:inherit;">${existingReason}</textarea>
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Adjuntar Comprobante (PDF o Imagen)</label>
            <input type="file" id="justFile" accept=".pdf,.png,.jpg,.jpeg" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1); font-size:0.85rem;" />
            ${existingDocPath ? `
              <div id="justCurrentFile" style="display:flex; align-items:center; gap:8px; background:rgba(var(--accent-rgb),0.06); padding:8px 12px; border-radius:8px; border:1px solid rgba(var(--accent-rgb),0.15); margin-top:8px;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span style="font-size:0.8rem; font-weight:600; color:var(--text-2); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;">
                  Comprobante adjunto actual
                </span>
                <a href="/uploads/${existingDocPath}" target="_blank" class="btn btn-sm btn-secondary" style="padding: 3px 8px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:700; text-transform:uppercase;">Ver</a>
              </div>
            ` : ''}
          </div>
        </div>
      </form>
    `;
    const footer = `
      <div style="display:flex; gap:10px; width:100%; justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('justifyForm').requestSubmit()">Guardar Justificación</button>
      </div>
    `;
    Modal.open(`Justificar Asistencia`, html, footer);
  },

  async submitJustification(employeeId, dateStr) {
    const saveBtn = document.querySelector('button[onclick="document.getElementById(\'justifyForm\').requestSubmit()"]');
    if (saveBtn) saveBtn.classList.add('btn-loading');

    const type = document.getElementById('justType').value;
    const override = document.getElementById('justOverride').value;
    const reason = document.getElementById('justReason').value.trim();
    const fileInput = document.getElementById('justFile');

    if (!reason) {
      if (saveBtn) saveBtn.classList.remove('btn-loading');
      Toast.show('El motivo es obligatorio', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('employee_id', employeeId);
    formData.append('date', dateStr);
    formData.append('justification_type', type);
    formData.append('override_status', override);
    formData.append('reason', reason);

    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El archivo excede el tamaño máximo permitido de 5MB', 'error');
        return;
      }
      formData.append('file', file);
    }

    try {
      const res = await API.postForm('/api/attendance/justify', formData);
      if (res && res.id) {
        Toast.show('Justificación guardada correctamente', 'success');
        Modal.close();
        this.loadTable();
      } else {
        Toast.show('Error al guardar justificación', 'error');
      }
    } catch (e) {
      Toast.show(e.message || 'Error de conexión', 'error');
    } finally {
      if (saveBtn) saveBtn.classList.remove('btn-loading');
    }
  },

  async removeJustification(justificationId) {
    if (!confirm('¿Está seguro de que desea eliminar esta justificación? Se restablecerán las faltas/tardanzas originales.')) return;
    try {
      await API.delete(`/api/attendance/justify/${justificationId}`);
      Toast.show('Justificación eliminada', 'success');
      this.loadTable();
    } catch (e) {
      Toast.show(e.message || 'Error al eliminar justificación', 'error');
    }
  },

  async openManualPunchModal() {
    try {
      const employees = await API.get('/api/employees') || [];
      this._employeeOptionsData = employees;
      
      const renderOptions = (emps) => emps.map(e => `<option value="${e.id}" style="padding: 6px; border-radius: 4px; margin-bottom: 2px;">${e.first_name} ${e.last_name} (${e.employee_code})</option>`).join('');

      const now = new Date();
      // format to YYYY-MM-DDTHH:MM
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      const html = `
        <div style="display:flex; flex-direction:column; gap:16px; padding: 4px 0;">
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Colaborador</label>
            <input type="text" id="manPunchSearch" placeholder="🔍 Buscar por nombre o ID..." oninput="AttendancePage.filterEmployees(this.value)" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1); margin-bottom: 8px; font-size: 0.85rem;" autocomplete="off" />
            <select id="manPunchEmpId" size="4" style="width:100%; border:1px solid var(--border); padding:4px; border-radius:8px; background:var(--surface-1); color:var(--text-1);">
              ${renderOptions(employees)}
            </select>
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Tipo de Marcación</label>
            <select id="manPunchType" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1);">
              <option value="entry">Entrada (Check-In)</option>
              <option value="exit">Salida (Check-Out)</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:0.85rem; color:var(--text-2);">Fecha y Hora</label>
            <input type="text" id="manPunchTime" value="${localISO}" style="width:100%; border:1px solid var(--border); padding:8px 12px; border-radius:8px; background:var(--surface-1); color:var(--text-1);" />
          </div>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="AttendancePage.submitManualPunch()">Registrar Marcación</button>
      `;

      Modal.open("Registrar Marcación Manual", html, footer);
      
      setTimeout(() => {
        if (window.flatpickr) {
          flatpickr("#manPunchTime", {
            enableTime: true,
            dateFormat: "Y-m-d\\TH:i",
            locale: "es",
            time_24hr: true,
            defaultDate: localISO
          });
        }
      }, 50);
    } catch (err) {
      Toast.show("Error al obtener lista de empleados", "error");
    }
  },

  async submitManualPunch() {
    const employeeId = document.getElementById('manPunchEmpId').value;
    const type = document.getElementById('manPunchType').value;
    const timeVal = document.getElementById('manPunchTime').value;

    if (!employeeId) { Toast.show("Debe seleccionar un colaborador", "warning"); return; }
    if (!timeVal) { Toast.show("Debe ingresar la fecha y hora", "warning"); return; }

    try {
      await API.post('/api/attendance/manual', {
        employee_id: parseInt(employeeId),
        event_time: new Date(timeVal).toISOString(),
        event_type: type
      });

      Toast.show("Marcación manual registrada correctamente", "success");
      Modal.close();
      this.loadTable();
    } catch (err) {
      Toast.show(err.message || "Error al guardar la marcación manual", "error");
    }
  },

  filterEmployees(query) {
    const q = query.toLowerCase();
    const filtered = (this._employeeOptionsData || []).filter(e => 
      (e.first_name || '').toLowerCase().includes(q) || 
      (e.last_name || '').toLowerCase().includes(q) || 
      (e.employee_code || '').toLowerCase().includes(q)
    );
    const select = document.getElementById('manPunchEmpId');
    if (!select) return;
    
    select.innerHTML = filtered.map(e => `<option value="${e.id}" style="padding: 6px; border-radius: 4px; margin-bottom: 2px;">${e.first_name} ${e.last_name} (${e.employee_code})</option>`).join('');
    if (filtered.length > 0) select.selectedIndex = 0;
  }
};
